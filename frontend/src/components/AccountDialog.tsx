type AccountMode = "login" | "register";

export function AccountDialog({ accountName }: { accountName: string }) {
  if (accountName) {
    return (
      <div className="account-panel account-panel-signed">
        <a className="account-name" href="/account">
          {accountName}
        </a>
        <form action="/api/account/logout" method="post">
          <button className="account-link" type="submit">
            退出
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="account-panel" id="account">
      <a className="account-tab account-tab-primary" href="#account-login">
        登录
      </a>
      <a className="account-tab" href="#account-register">
        注册
      </a>
    </div>
  );
}

export function AccountModals() {
  return (
    <>
      <AccountModal mode="login" />
      <AccountModal mode="register" />
    </>
  );
}

function AccountModal({ mode }: { mode: AccountMode }) {
  const isRegister = mode === "register";
  const modalId = isRegister ? "account-register" : "account-login";
  const titleId = `${modalId}-title`;

  return (
    <div className="account-modal-backdrop" id={modalId} role="presentation">
      <a className="account-modal-dismiss" href="#account" aria-label="关闭" />
      <section className={`account-modal ${isRegister ? "account-modal-wide" : ""}`} aria-modal="true" aria-labelledby={titleId} role="dialog">
        <div className="account-modal-heading">
          <h2 id={titleId}>{isRegister ? "注册账号" : "登录账号"}</h2>
          <a className="account-modal-close" href="#account" aria-label="关闭">
            ×
          </a>
        </div>
        <form className="account-modal-form" action={isRegister ? "/api/account/register" : "/api/account/login"} method="post">
          <label htmlFor={`${modalId}-name`}>账号</label>
          <input id={`${modalId}-name`} name="account" placeholder="账号名称" autoComplete="username" required />
          <label htmlFor={`${modalId}-password`}>密码</label>
          <input
            id={`${modalId}-password`}
            name="password"
            type="password"
            placeholder="密码"
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={6}
            required
          />
          {isRegister ? (
            <>
              <label htmlFor="account-register-confirm-password">确认密码</label>
              <input
                id="account-register-confirm-password"
                name="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                autoComplete="new-password"
                minLength={6}
                required
              />
              <div className="account-modal-grid">
                <div>
                  <label htmlFor="account-register-full-name">姓名</label>
                  <input id="account-register-full-name" name="full_name" placeholder="真实姓名" autoComplete="name" />
                </div>
                <div>
                  <label htmlFor="account-register-gender">性别</label>
                  <select id="account-register-gender" name="gender" defaultValue="">
                    <option value="">请选择</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="account-register-grade">年级</label>
                  <select id="account-register-grade" name="grade" defaultValue="">
                    <option value="">请选择</option>
                    <option value="大一">大一</option>
                    <option value="大二">大二</option>
                    <option value="大三">大三</option>
                    <option value="大四">大四</option>
                    <option value="研究生">研究生</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="account-register-member-status">身份信息</label>
                  <select id="account-register-member-status" name="member_status" defaultValue="">
                    <option value="">请选择</option>
                    <option value="非战队队员">非战队队员</option>
                    <option value="梯队队员">梯队队员</option>
                    <option value="正式队员">正式队员</option>
                    <option value="老队员">老队员</option>
                    <option value="退役队员">退役队员</option>
                    <option value="老师">老师</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="account-register-department">部门信息</label>
                  <select id="account-register-department" name="department" defaultValue="">
                    <option value="">请选择</option>
                    <option value="电控">电控</option>
                    <option value="机械">机械</option>
                    <option value="算法">算法</option>
                    <option value="运营">运营</option>
                  </select>
                </div>
              </div>
            </>
          ) : null}
          <button className="button" type="submit">
            {isRegister ? "注册" : "登录"}
          </button>
        </form>
        <a className="account-switch" href={isRegister ? "#account-login" : "#account-register"}>
          {isRegister ? "已有账号，点击登录" : "没有账号，点击注册"}
        </a>
      </section>
    </div>
  );
}
