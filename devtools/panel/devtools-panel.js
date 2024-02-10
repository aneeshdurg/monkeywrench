let promptInput = null;
async function authenticateDevice() {
  browserShim.log("authenticateDevice");
  const resp = await fetch("https://github.com/login/device/code", {
    method: "POST",
    body: JSON.stringify({
      client_id: "Iv1.b507a08c87ecfe98",
      scope: "read:user",
    }),
    headers: {
      accept: "application/json",
      "editor-version": "Neovim/0.6.1",
      "editor-plugin-version": "copilot.vim/1.16.0",
      "content-type": "application/json",
      "user-agent": "GithubCopilot/1.155.0",
      "accept-encoding": "gzip,deflate,br",
    },
  });
  browserShim.log(`resp: ${resp}`);
  const json = await resp.json();
  browserShim.log(`resp.json: ${JSON.stringify(json)}`);
  const user_code = json["user_code"];
  const device_code = json["device_code"];
  const verification_uri = json["verification_uri"];

  const evalString = `alert('Please visit ${verification_uri} and enter the code: ${user_code} to authenticate.')`;
  const res = await browserShim.evalInInspectedWindow(evalString);

  return device_code;
}

async function getToken() {
  const currTime = (new Date()).getTime();

  const token_obj = await browserShim.getFromStorage("token");
  if (token_obj.token) {
    const creation = token_obj.token.createdAt;
    // 25 min TTL
    if ((currTime - creation) < (25 * 60 * 1000)) {
      return token_obj.token.value;
    }
  }

  const newToken = { value: null, createdAt: currTime };

  const device_obj = await browserShim.getFromStorage("device_code");
  const device_code = device_obj.device_code;

  const auth_obj = await browserShim.getFromStorage("auth_token");
  const auth_token = auth_obj.auth_token;
  const resp = await fetch("https://api.github.com/copilot_internal/v2/token", {
    method: "GET",
    headers: {
      "authorization": `token ${auth_token}`,
      "editor-version": "Neovim/0.6.1",
      "editor-plugin-version": "copilot.vim/1.16.0",
      "user-agent": "GithubCopilot/1.155.0",
    }
  });

  const resp_json = await resp.json();
  browserShim.log(resp_json);
  newToken.value = resp_json['token'];

  await browserShim.setInStorage("token", newToken);
  return newToken.value;
}

async function initialSetup() {
  browserShim.log("Initial setup");
  browserShim.log("running...");
  const cached_token = await browserShim.getFromStorage("auth_token");
  if (!cached_token.auth_token) {
    browserShim.log(`auth_token not found in cache`);
    const device_obj = await browserShim.getFromStorage("device_code");
    let device_code = device_obj.device_code;
    if (!device_code){
      device_code = await authenticateDevice();
      await browserShim.SetInStorage("device_code", device_code);
    }

    browserShim.log("authenticated")

    const resp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      body: JSON.stringify({
        client_id: "Iv1.b507a08c87ecfe98",
        device_code: device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
      headers: {
        "accept": "application/json",
        "editor-version": "Neovim/0.6.1",
        "editor-plugin-version": "copilot.vim/1.16.0",
        "content-type": "application/json",
        "user-agent": "GithubCopilot/1.155.0",
        "accept-encoding": "gzip,deflate,br",
      },
    });
    const json = await resp.json();
    browserShim.log(json);
    const access_token = json["access_token"];
    await browserShim.setInStorage("auth_token", access_token);
    browserShim.log(`access_token: ${access_token}`);

    const token = await getToken();
    browserShim.log(`api_token: ${token}`);
  }

  document.getElementById("pre-setup").style.display = "none";
  document.getElementById("post-setup").style.display = "";
}

async function completePrompt(promptPrefix, promptSuffix) {
  const auth_token = await browserShim.getFromStorage("auth_token");
  browserShim.log(auth_token);

  if (!auth_token.auth_token) {
    const evalString = `alert('Cannot complete prompt without authenticating. Please run the setup first.')`;
    const res = await browserShim.evalInInspectedWindow(evalString);
    return;
  }

  const input_context = document.getElementById("input_context").value;
  // TODO - expose probabilities as settings
  const query = `(() => {
    function cloneAndRandomlyDropDataAttributes(node, prob) {
      const cloned_node = node.cloneNode();
      for (let attr of node.attributes) {
        if (attr.name.startsWith('data-')) {
          if (Math.random() < prob) {
            cloned_node.removeAttribute(attr.name);
          } else if (cloned_node.getAttribute(attr.name).length > 10) {
            // Truncate long data attributes
            cloned_node.setAttribute(attr.name, '...');
          }
        }
      }

      return cloned_node;
    }

    // For now drop all attributes
    const dropAttributesProb = 0.5;

    function probabalisticClone(parent, node, prob) {
      // if the node is a text node, just append it to the parent.
      if (node.nodeType === Node.TEXT_NODE) {
        parent.appendChild(node.cloneNode());
        return;
      }

      // If the node is not an element node, just return.
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      if (Math.random() < prob) {
        const cloned_node = cloneAndRandomlyDropDataAttributes(node, dropAttributesProb);
        parent.appendChild(cloned_node);
        for (let child_node of node.childNodes) {
          probabalisticClone(cloned_node, child_node, prob / 2);
        }
        return;
      }

      // Fifty-fifty chance of not cloning the node, or directly replacing it
      // with it's child nodes.
      if (Math.random() < prob / 2) {
        for (let child_node of node.childNodes) {
          probabalisticClone(parent, child_node, prob / 2);
        }
      }
    }

    const nodes = document.querySelectorAll('${input_context}');
    const cleaned_nodes = [];
    for (let node of nodes) {
      const cloned_node = cloneAndRandomlyDropDataAttributes(node, dropAttributesProb);

      for (let child_node of node.childNodes) {
        probabalisticClone(cloned_node, child_node, 0.5);
      }
      cloned_node.querySelectorAll('path').forEach(x => x.setAttribute('d', '...'));
      cleaned_nodes.push(cloned_node);
    }
    return cleaned_nodes.map(x => x.outerHTML).join('\\n');
  })()`;

  // TODO - replace this with the actual contents of the page
  let page_source = await browserShim.evalInInspectedWindow(query);
  page_source = html_beautify(page_source[0]);

  let page_source_lines = page_source.split('\n');
  browserShim.log(page_source, page_source_lines.length);

  // TODO - replace this with the actual URL of the page
  const page_url = await browserShim.evalInInspectedWindow("window.location.href");

  const language = "javascript";
  const token = await getToken();

  const container = document.getElementById("errorContainer");
  container.innerHTML = "";

  let text = "";
  try {
    const resp = await fetch("https://copilot-proxy.githubusercontent.com/v1/engines/copilot-codex/completions", {
      method: "POST",
      body: JSON.stringify({
        prompt: `<!-- Path: ${page_url} -->\n${page_source}\n<script>\n${promptPrefix}`,
        suffix: "${promptSuffix}\n</script>",
        max_tokens: 1000,
        temperature: 0,
        top_p: 1,
        n: 1,
        stop: ["\n"],
        nwo: "github/copilot.vim",
        stream: true,
        extra: {
          language: language,
        },
      }),
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    if (resp.ok) {
      text = await resp.text();
    } else {
      console.log(resp);
      //const err = await resp.json();
      throw new Error(`Failed to fetch response: ${0}`);
    }
  } catch (e) {
    const error = document.createElement("div");
    error.classList.add("error");
    error.innerText = "Request failed - try a more restrictive selector";
    container.appendChild(error);
    error.onclick = () => {
      error.remove();
    };

    return null;
  }

  const lines = text.split('\n');
  const data = lines.filter(x => x.startsWith('data: {')).map((x) => {
    try {
      return JSON.parse(x.slice(6));
    } catch (e) {
      browserShim.log(e, x);
      return "";
    }
  })
  browserShim.log(data)
  let result = "";
  for (let d of data) {
    result += d["choices"][0]["text"];
  }

  browserShim.log(result);
  return result;
}

document.addEventListener("DOMContentLoaded", async function() {
  if (typeof browser === "undefined") {
    window.browser = chrome;
  }

  browserShim.log("Loaded devtools panel");

  const input_el = document.getElementById("input_prompt");
  createEditor(input_el, completePrompt);

  browserShim.log(browserShim);

  const cached_token = await browserShim.getFromStorage("auth_token");
  browserShim.log("Cached token: ", cached_token);
  if (!cached_token.auth_token) {
    document.getElementById("pre-setup").style.display = "";
  } else {
    document.getElementById("post-setup").style.display = "";
  }
});
