window.onload = () => {
  startTimer(5, 0);
}

let freezeTimer = false;

const startTimer = (minutes, seconds) => {
  if (freezeTimer) {
    return;
  }
  const timer = document.getElementById("otp-timer");
  timer.innerText = numberToText(minutes) + ":" + numberToText(seconds);
  if (minutes || seconds) {
    setTimeout(() => {
      const [newMinutes, newSeconds] = seconds ? [minutes, seconds - 1] : [minutes - 1, 59];
      startTimer(newMinutes, newSeconds);
    }, 1000);
  } else {
    document.getElementById("start-button").disabled = true;
  }
}

const numberToText = (num) => {
  return num < 10 ? "0" + num.toString() : num.toString();
}

const toggleButtons = (disable) => {
  document.getElementById("submit-button").disabled = disable;
  document.getElementById("cancel-button").disabled = disable;
}

const toggleOtpTextbox = (disable, resendLoader = false, resetTimer = false) => {
  document.getElementById("otp").disabled = disable;
  const resendOtp = document.getElementById("resendOtp");
  resendOtp.classList.toggle("disabled", disable);
  if (resendLoader) {
    toggleResendLoader(!disable);
  }
  if (disable) {
    freezeTimer = true;
  } else {
    freezeTimer = false;
    const [mins, secs] = resetTimer ? [5, 0] : document.getElementById("otp-timer").innerText.split(":").map(t => parseInt(t));
    startTimer(mins, secs);
  }
}

const toggleResendLoader = (enable) => {
  document.getElementById("resendOtp").innerText = !enable ? "Loading..." : "Click here to Resend OTP";
}

const toggleLoader = (btnType, enable) => {
  const id = btnType === "SUBMIT" ? "submit-button" : "cancel-button";
  const text = btnType === "SUBMIT" ? "Submit" : "Cancel";
  if (enable) {
    document.getElementById(id).innerHTML =
      `<div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>`;
  } else {
    document.getElementById(id).innerText = text;
  }
}

const toggleSuccess = (show = true) => {
  const otpSuccess = document.getElementById("otpSuccess");
  otpSuccess.classList.toggle("d-none", !show);
}

const showFailure = () => {
  const otpFailure = document.getElementById("otpFailure");
  otpFailure.classList.toggle("d-none", false);
}

const toggleSystemFailure = (enable) => {
  const systemFailure = document.getElementById("systemError");
  systemFailure.classList.toggle("d-none", !enable);
}

function postToUrl(url, reqBody) {
  const form = document.createElement("form");
  form.setAttribute("method", "POST");
  form.setAttribute("action", url);

  for (const key in reqBody) {
    if (reqBody.hasOwnProperty(key)) {
      const hiddenField = document.createElement("input");
      hiddenField.setAttribute("type", "hidden");
      hiddenField.setAttribute("name", key);
      hiddenField.setAttribute("value", reqBody[key]);
      form.appendChild(hiddenField);
    }
  }
  document.body.appendChild(form);
  form.submit();
}

const isSuccess = (resp) => {
  return /^(ACCU){0,1}[0-9]00$/.test(resp.AccuResponseCode);
}

const submitOtp = (event) => {
  event.preventDefault();
  toggleOtpTextbox(true);
  toggleButtons(true);
  toggleLoader("SUBMIT", true);

  const otpVal = document.getElementById("otp").value;
  const baseUrl = window.location.origin;
  const endPoint = "/card-issuance/ampere/redirect/authAction";
  const url = baseUrl + endPoint;
  const reqBody = {
    otp: otpVal,
    action: "SUBMIT"
  };
  const options = {
    credentials: "same-origin",
    method: "POST",
    headers: {
      'Content-type':'application/json'
    },
    body: JSON.stringify(reqBody)
  };
  let fetchSuccess = false;

  fetch(url, options)
    .then(resp => resp.json())
    .then(resp => {
      fetchSuccess = true;
      if (isSuccess(resp)) {
        toggleSuccess();
        toggleLoader("SUBMIT", false);
        postToUrl(resp.AccuReturnUrl, {
          ...resp,
          AccuReturnUrl: undefined
        });
      } else {
        showFailure();
        toggleLoader("SUBMIT", false);
        postToUrl(resp.AccuReturnUrl, {
          ...resp,
          AccuReturnUrl: undefined
        });
      }
    }).catch(() => {
      if(fetchSuccess) {
        return;
      }
      toggleSystemFailure(true);
      toggleLoader("SUBMIT", false);
      setTimeout(() => {
        toggleSystemFailure(false);
        toggleButtons(false);
        toggleOtpTextbox(false);
      }, 2000);
    });
}

const resendOtp = (event) => {
  event.preventDefault();
  toggleOtpTextbox(true, true);
  toggleButtons(true);
  const baseUrl = window.location.origin;
  const endPoint = "/card-issuance/ampere/redirect/authAction";
  const url = baseUrl + endPoint;
  const reqBody = {
    "action": "RESEND"
  };
  const options = {
    credentials: "same-origin",
    method: "POST",
    headers: {
      'Content-type':'application/json'
    },
    body: JSON.stringify(reqBody)
  };
  let fetchSuccess = false;

  fetch(url, options)
    .then(resp => resp.json())
    .then(resp => {
      fetchSuccess = true;
      if (isSuccess(resp)) {
        toggleButtons(false);
        toggleOtpTextbox(false, true, true);
      } else {
        showFailure();
        postToUrl(resp.AccuReturnUrl, {
          ...resp,
          AccuReturnUrl: undefined
        });
      }
    }).catch(() => {
      if(fetchSuccess) {
        return;
      }
      toggleSystemFailure(true);
      toggleResendLoader(true);
      setTimeout(() => {
        toggleSystemFailure(false);
        toggleButtons(false);
        toggleOtpTextbox(false, true);
      }, 2000);
    });
}

const cancelOtp = (event) => {
  event.preventDefault();
  toggleOtpTextbox(true);
  toggleButtons(true);
  toggleLoader("CANCEL", true);

  const baseUrl = window.location.origin;
  const endPoint = "/card-issuance/ampere/redirect/authAction";
  const url = baseUrl + endPoint;
  const reqBody = {
    "action": "CANCEL"
  };
  const options = {
    credentials: "same-origin",
    method: "POST",
    headers: {
      'Content-type':'application/json'
    },
    body: JSON.stringify(reqBody)
  };
  let fetchSuccess = false;

  fetch(url, options)
    .then(resp => resp.json())
    .then(resp => {
      fetchSuccess = true;
      toggleLoader("CANCEL", false);
      postToUrl(resp.AccuReturnUrl, {
        ...resp,
        AccuReturnUrl: undefined
      });
    }).catch(() => {
      if(fetchSuccess) {
        return;
      }
      toggleSystemFailure(true);
      toggleLoader("CANCEL", false);
      setTimeout(() => {
        toggleSystemFailure(false);
        toggleButtons(false);
        toggleOtpTextbox(false);
      }, 2000);
    });
}
