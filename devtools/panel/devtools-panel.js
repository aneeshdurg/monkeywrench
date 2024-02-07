// /**
// Handle errors from the injected script.
// Errors may come from evaluating the JavaScript itself
// or from the devtools framework.
// See https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/devtools.inspectedWindow/eval#Return_value
// */
// function handleError(error) {
//   if (error.isError) {
//     console.log(`Devtools error: ${error.code}`);
//   } else {
//     console.log(`JavaScript error: ${error.value}`);
//   }
// }
//
// /**
// Handle the result of evaluating the script.
// If there was an error, call handleError.
// */
// function handleResult(result) {
//   if (result[1]) {
//     handleError(result[1]);
//   }
// }
// /**
// When the user clicks each of the first three buttons,
// evaluate the corresponding script.
// */
// const evalString = "$0.style.backgroundColor = 'red'";
// document.getElementById("button_background").addEventListener("click", () => {
//   browser.devtools.inspectedWindow.eval(evalString).then(handleResult);
// });
//
// const inspectString = "inspect(document.querySelector('h1'))";
// document.getElementById("button_h1").addEventListener("click", () => {
//   browser.devtools.inspectedWindow.eval(inspectString).then(handleResult);
// });


async function authenticateDevice() {
  console.log("authenticateDevice");
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
  console.log(`resp: ${resp}`);
  const json = await resp.json();
  console.log(`resp.json: ${JSON.stringify(json)}`);
  const user_code = json["user_code"];
  const device_code = json["device_code"];
  const verification_uri = json["verification_uri"];

  const evalString = `alert('Please visit ${verification_uri} and enter the code: ${user_code} to authenticate.')`;
  const res = await browser.devtools.inspectedWindow.eval(evalString);

  return device_code;
}

async function getToken() {
  const currTime = (new Date()).getTime();

  const token_obj = await browser.storage.local.get({ token: null });
  if (token_obj.token) {
    const creation = token_obj.token.createdAt;
    // 25 min TTL
    if ((currTime - creation) < (25 * 60 * 1000)) {
      return token_obj.token.value;
    }
  }

  const newToken = { value: null, createdAt: currTime };

  const device_obj = await browser.storage.local.get({ device_code: null });
  const device_code = device_obj.device_code;

  const auth_obj = await browser.storage.local.get({ auth_token: null });
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
  console.log(resp_json);
  newToken.value = resp_json['token'];

  await browser.storage.local.set({ token: newToken });
  return newToken.value;
}

document.getElementById("button_setup").addEventListener("click", async () => {
  console.log("Initial setup");
  console.log("running...");
  const cached_token = await browser.storage.local.get({ auth_token: null });
  if (!cached_token.auth_token) {
    console.log(`auth_token not found in cache`);
    const device_obj = await browser.storage.local.get({ device_code: null });
    let device_code = device_obj.device_code;
    if (!device_code){
      device_code = await authenticateDevice();
      await browser.storage.local.set({ device_code: device_code });
    }

    console.log("authenticated")

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
    console.log(json);
    const access_token = json["access_token"];
    await browser.storage.local.set({ auth_token: access_token });
    console.log(`access_token: ${access_token}`);

    const token = await getToken();
    console.log(`api_token: ${token}`);
  }
});

async function doCompletePrompt(prompt) {
  const auth_token = await browser.storage.local.get({ auth_token: null });
  console.log(auth_token);

  if (!auth_token.auth_token) {
    return;
  }

  console.log(`prompt: ${prompt}`);

  const language = "javascript";
  const token = await getToken();
  const resp = await fetch("https://copilot-proxy.githubusercontent.com/v1/engines/copilot-codex/completions", {
    method: "POST",
    body: JSON.stringify({
      prompt: prompt,
      suffix: "",
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

  const text = await resp.text();
  console.log(text);
  const lines = text.split('\n');
  const data = lines.filter(x => x.startsWith('data: {')).map((x) => {
    try {
      return JSON.parse(x.slice(6));
    } catch (e) {
      console.log(e, x);
      return "";
    }
  })
  console.log(data)
  let result = "";
  for (let d of data) {
    result += d["choices"][0]["text"];
  }

  console.log(result);
  return result;
}

async function completePrompt() {
  const input_el = document.getElementById("input_prompt");

  let prompt = input_el.value;
  let result = await doCompletePrompt(prompt);
  if (result.length === 0) {
    prompt += "\n";
    result = await doCompletePrompt(prompt);
    if (result.length) {
      result = "\n" + result;
    }
  }

  input_el.value += result;
}

document.getElementById("button_prompt").addEventListener("click", completePrompt);
