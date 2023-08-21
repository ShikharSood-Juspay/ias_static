window.onload = () => {
  startTimer();
};

window.onbeforeunload = (event) => {
  event.preventDefault();
  return event.returnValue = '';
};

let freezeTimer = false;
const startTime = Date.now() + 300000;

const startTimer = () => {
  if (freezeTimer) {
    return;
  }
  const now = Date.now();
  const diff = startTime - now;
  const minutes = Math.max(0, Math.floor(diff / 60000) % 60);
  const seconds = Math.max(0, Math.floor(diff / 1000) % 60);
  const timer = document.getElementById("otp-timer");
  timer.innerText = numberToText(minutes) + ":" + numberToText(seconds);
  if (minutes || seconds) {
    setTimeout(() => {
      const [newMinutes, newSeconds] = seconds ? [minutes, seconds - 1] : [minutes - 1, 59];
      startTimer(newMinutes, newSeconds);
    }, 1000);
  } else {
    toggleButtons(true);
    toggleOtpTextbox(true);
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

const toggleToast = (message, type) => {
  const toast = document.getElementById("toast-target");
  document.getElementById("toast-message").innerText = message;
  toast.classList.remove("text-bg-danger");
  toast.classList.remove("text-bg-success");
  toast.classList.add("text-bg-" + type);
  new bootstrap.Toast(toast).show();
};

const toggleModal = (message, onContinue) => {
  const modal = new bootstrap.Modal(document.getElementById("modal-target"));
  document.getElementById("modal-message").innerText = message;
  document.getElementById("modal-confirmation").onclick = () => {
    modal.hide();
    onContinue();
  }
  modal.show();
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

const toggleSuccess = () => {
  toggleToast("Success", "success");
}

const showFailure = () => {
  toggleToast("Failure", "danger");
}

const toggleSystemFailure = () => {
  toggleToast("Something went wrong", "danger");
}

function postToUrl(url, reqBody) {
  const form = document.createElement("form");
  form.setAttribute("method", "POST");
  form.setAttribute("action", url);
  delete reqBody.AccuReturnUrl

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
  const endPoint = "/api/redirect/authAction";
  const url = baseUrl + endPoint;
  const reqBody = {
    otp: otpVal,
    action: "SUBMIT"
  };
  const options = {
    credentials: "same-origin",
    method: "POST",
    headers: {
      'Content-type': 'application/json'
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
      if (fetchSuccess) {
        return;
      }
      toggleSystemFailure(true);
      toggleLoader("SUBMIT", false);
      toggleButtons(false);
      toggleOtpTextbox(false);
    });
}

const resendOtp = (event) => {
  event.preventDefault();
  toggleOtpTextbox(true, true);
  toggleButtons(true);
  const baseUrl = window.location.origin;
  const endPoint = "/api/redirect/authAction";
  const url = baseUrl + endPoint;
  const reqBody = {
    "action": "RESEND"
  };
  const options = {
    credentials: "same-origin",
    method: "POST",
    headers: {
      'Content-type': 'application/json'
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
      if (fetchSuccess) {
        return;
      }
      toggleSystemFailure(true);
      toggleResendLoader(true);
      toggleButtons(false);
      toggleOtpTextbox(false, true);
    });
}

const cancelOtp = (event) => {
  event.preventDefault();
  toggleModal("Are you sure you want to Cancel?", () => handleOtherEvents("CANCEL"));
};

const handleOtherEvents = (eventType) => {
  toggleOtpTextbox(true);
  toggleButtons(true);

  const baseUrl = window.location.origin;
  const endPoint = "/api/redirect/authAction";
  const url = baseUrl + endPoint;
  const reqBody = {
    "action": eventType
  };
  const options = {
    credentials: "same-origin",
    method: "POST",
    headers: {
      'Content-type': 'application/json'
    },
    body: JSON.stringify(reqBody)
  };
  let fetchSuccess = false;

  fetch(url, options)
    .then(resp => resp.json())
    .then(resp => {
      fetchSuccess = true;
      postToUrl(resp.AccuReturnUrl, {
        ...resp,
        AccuReturnUrl: undefined
      });
    }).catch(() => {
      if (fetchSuccess) {
        return;
      }
      toggleSystemFailure(true);
      toggleButtons(false);
      toggleOtpTextbox(false);
    });
}
