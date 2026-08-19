/* ============================================================
   auth.js — 로그인 화면 간 이동 및 브라우저 세션(state) 관리
   - 입력한 이메일/아이디는 sessionStorage에 보관하여
     비밀번호 화면 및 이메일 화면 사이를 오갈 때 유지한다.
   ============================================================ */

const AUTH_KEY = "gf_signin_identifier";
const TRAINING_ID_KEY = "gf_training_id";
const RECIPIENT_ID_KEY = "gf_recipient_id";
const GA_MEASUREMENT_ID = "G-L92HHMB9Y9";
const TRACKING_VALUE_RE = /^[A-Za-z0-9_-]{3,128}$/;

const Auth = {
  getIdentifier() {
    return sessionStorage.getItem(AUTH_KEY) || "";
  },
  setIdentifier(value) {
    sessionStorage.setItem(AUTH_KEY, value);
  },
  clear() {
    sessionStorage.removeItem(AUTH_KEY);
  },
};

const TrainingTracking = {
  syncFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const trainingId = normalizeTrackingValue(params.get("tid"));
    const recipientId = normalizeTrackingValue(params.get("rid"));

    if (trainingId) sessionStorage.setItem(TRAINING_ID_KEY, trainingId);
    if (recipientId) sessionStorage.setItem(RECIPIENT_ID_KEY, recipientId);
  },
  getTrainingId() {
    return sessionStorage.getItem(TRAINING_ID_KEY) || "";
  },
  getRecipientId() {
    return sessionStorage.getItem(RECIPIENT_ID_KEY) || "";
  },
  getParams() {
    return {
      training_id: this.getTrainingId(),
      recipient_id: this.getRecipientId(),
    };
  },
  buildUrl(path) {
    const params = new URLSearchParams();
    const trainingId = this.getTrainingId();
    const recipientId = this.getRecipientId();

    if (trainingId) params.set("tid", trainingId);
    if (recipientId) params.set("rid", recipientId);

    const query = params.toString();
    return query ? path + "?" + query : path;
  },
};

function normalizeTrackingValue(value) {
  const text = (value || "").trim();
  return TRACKING_VALUE_RE.test(text) ? text : "";
}

function sendAnalyticsEvent(eventName, params) {
  if (typeof window.gtag !== "function") return;

  window.gtag("event", eventName, {
    send_to: GA_MEASUREMENT_ID,
    ...params,
  });
}

function sendTrainingEvent(step, params) {
  sendAnalyticsEvent("training_step", {
    ...TrainingTracking.getParams(),
    training_step: step,
    ...params,
  });
}

function getIdentifierType(value) {
  if (EMAIL_RE.test(value)) return "email";
  if (PHONE_RE.test(value)) return "phone";
  return "unknown";
}

/* ---------- 상단 로딩바 제어 ---------- */
function showProgress() {
  const bar = document.getElementById("progress");
  if (bar) {
    bar.classList.add("is-active");
    bar.setAttribute("aria-hidden", "false");
  }
}

function hideProgress() {
  const bar = document.getElementById("progress");
  if (bar) {
    bar.classList.remove("is-active");
    bar.setAttribute("aria-hidden", "true");
  }
}

/* ---------- 이메일/휴대전화 검증 ---------- */
// 이메일 형식: 로컬@도메인.tld (공백·중복 @ 불가)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 휴대전화: 숫자/공백/+/-/() 조합, 숫자 7자리 이상
const PHONE_RE = /^[+]?[0-9\s()\-]{7,}$/;

function validateIdentifier(rawValue) {
  const value = rawValue.trim();
  if (!value) {
    return "이메일 또는 전화번호를 입력하세요.";
  }
  if (EMAIL_RE.test(value) || PHONE_RE.test(value)) {
    return ""; // 통과
  }
  return "유효한 이메일 또는 휴대전화 번호를 입력하세요.";
}

/* ---------- 이메일(아이디) 화면 ---------- */
function initEmailScreen() {
  TrainingTracking.syncFromUrl();
  sendTrainingEvent("login_page_accessed", {
    page_name: "login",
  });

  const form = document.getElementById("signin-form");
  const input = document.getElementById("identifier");
  if (!form || !input) return;

  const field = document.getElementById("id-field");
  const errorEl = document.getElementById("id-error");

  function showError(message) {
    if (field) field.classList.add("field--error");
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add("is-visible");
    }
  }

  function clearError() {
    if (field) field.classList.remove("field--error");
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.classList.remove("is-visible");
    }
  }

  // 사용자가 다시 입력하면 오류 표시를 지운다.
  input.addEventListener("input", clearError);

  // 이전에 입력했던 아이디가 있으면 복원한다.
  const saved = Auth.getIdentifier();
  if (saved) {
    input.value = saved;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const errorMessage = validateIdentifier(input.value);
    if (errorMessage) {
      showError(errorMessage);
      input.focus();
      return; // 검증 실패 시 다음 화면으로 넘어가지 않는다.
    }

    clearError();
    const identifier = input.value.trim();
    Auth.setIdentifier(identifier);
    sendAnalyticsEvent("login_identifier_submitted", {
      ...TrainingTracking.getParams(),
      identifier_type: getIdentifierType(identifier),
      auth_step: "identifier",
    });
    sendTrainingEvent("login_identifier_submitted", {
      identifier_type: getIdentifierType(identifier),
      identifier_entered: true,
    });
    // 로딩바를 잠시 보여준 뒤 다음 화면으로 이동
    showProgress();
    setTimeout(function () {
      window.location.href = TrainingTracking.buildUrl("password.html");
    }, 600);
  });
}

/* ---------- 비밀번호 화면 ---------- */
function initPasswordScreen() {
  TrainingTracking.syncFromUrl();
  sendTrainingEvent("password_page_accessed", {
    page_name: "password",
  });

  const identifier = Auth.getIdentifier();

  // 아이디 정보가 없으면 이메일 입력 화면으로 되돌린다.
  if (!identifier) {
    window.location.replace(TrainingTracking.buildUrl("login.html"));
    return;
  }

  const emailLabel = document.getElementById("chip-email");
  if (emailLabel) emailLabel.textContent = identifier;

  const chip = document.getElementById("account-chip");
  if (chip) {
    chip.setAttribute(
      "aria-label",
      identifier + " 항목이 선택되었습니다. 계정 전환"
    );
    // 이메일부 드롭다운 클릭 → 기존 아이디를 유지한 채 이메일 입력 화면으로 복귀
    chip.addEventListener("click", function () {
      window.location.href = TrainingTracking.buildUrl("login.html");
    });
  }

  // 비밀번호 표시 토글
  const toggle = document.getElementById("show-password");
  const pw = document.getElementById("password");
  if (toggle && pw) {
    toggle.addEventListener("change", function () {
      pw.type = toggle.checked ? "text" : "password";
    });
  }

  const form = document.getElementById("password-form");
  if (form && pw) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!pw.value) {
        pw.focus();
        return;
      }
      sendAnalyticsEvent("login_password_submitted", {
        ...TrainingTracking.getParams(),
        identifier_type: getIdentifierType(identifier),
        auth_step: "password",
      });
      sendTrainingEvent("login_password_submitted", {
        identifier_type: getIdentifierType(identifier),
        password_entered: true,
      });
      // 로딩바를 잠시 보여준 뒤 훈련 안내 화면으로 이동
      showProgress();
      setTimeout(function () {
        window.location.href = TrainingTracking.buildUrl("notice.html");
      }, 600);
    });
  }

  // 계정 칩(드롭다운)으로 이메일 화면 복귀 시에도 로딩바 표시
  if (chip) {
    chip.addEventListener("click", showProgress);
  }
}

function initNoticeScreen() {
  TrainingTracking.syncFromUrl();
  sendTrainingEvent("notice_page_accessed", {
    page_name: "notice",
  });
}
