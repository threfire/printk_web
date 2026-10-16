import Link from "next/link";

export default function CampusChallengePage() {
  return (
    <div className="page campus-event-page">
      <section className="campus-event-hero" aria-labelledby="challenge-title">
        <div>
          <span className="eyebrow">2027 CAMPUS COMPETITION / CHALLENGE</span>
          <h1 id="challenge-title">挑战赛</h1>
          <p>操作真正的 RoboMaster 步兵机器人，在 1v1 对抗中体验移动、瞄准、射击与临场决策。</p>
          <div className="campus-event-actions">
            <a className="button campus-primary-action" href="#registration">立即报名</a>
            <Link className="ghost-button" href="/campus-competition">返回赛项选择</Link>
          </div>
        </div>
        <div className="campus-event-mark" aria-hidden="true">
          <span>01</span>
          <strong>1V1</strong>
          <small>REAL ROBOT</small>
        </div>
      </section>

      <section className="campus-event-section campus-event-overview" aria-labelledby="challenge-overview-title">
        <div className="campus-section-number">01</div>
        <div>
          <span className="eyebrow">EVENT OVERVIEW</span>
          <h2 id="challenge-overview-title">真实步兵机器人对抗</h2>
          <p>参赛者直接操作 RoboMaster 步兵机器人进入 1v1 场地，通过对机器人运动状态、攻击节奏和场地位置的判断完成对抗。赛项面向希望快速体验机甲竞技和真实机器人操控的同学。</p>
        </div>
      </section>

      <section className="campus-registration-panel" id="registration" aria-labelledby="challenge-registration-title">
        <div>
          <span className="eyebrow">REGISTRATION</span>
          <h2 id="challenge-registration-title">挑战赛报名</h2>
          <p>报名信息与开放时间将在校内赛公告栏持续更新，赛事负责人将协助完成参赛登记。</p>
        </div>
        <Link className="button campus-primary-action" href="/#home-contact">联系负责人报名</Link>
      </section>
    </div>
  );
}
