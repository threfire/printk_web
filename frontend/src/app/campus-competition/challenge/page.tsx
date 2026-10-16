import Link from "next/link";

export default function CampusChallengePage() {
  return (
    <div className="page campus-event-page">
      <section className="campus-event-hero" aria-labelledby="challenge-title">
        <div>
          <span className="eyebrow">2027 CAMPUS COMPETITION / CHALLENGE</span>
          <h1 id="challenge-title">挑战赛</h1>
          <p>高校联盟赛步兵对抗赛操作手选拔赛暨 3v3 对抗赛候选操作手选拔赛。操作真正的 RoboMaster 步兵机器人，在 1v1 对抗中体验移动、瞄准、射击与临场决策。</p>
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
          <h2 id="challenge-overview-title">高校联盟赛操作手选拔</h2>
          <p>本赛项面向高校联盟赛步兵对抗赛操作手选拔，并承担 3v3 对抗赛候选操作手选拔任务。参赛者直接操作 RoboMaster 步兵机器人进入 1v1 场地，通过对机器人运动状态、攻击节奏和场地位置的判断完成对抗。</p>
        </div>
      </section>

      <section className="campus-event-section" aria-labelledby="challenge-schedule-title">
        <div className="campus-section-number">02</div>
        <div>
          <span className="eyebrow">SCHEDULE &amp; FORMAT</span>
          <h2 id="challenge-schedule-title">赛制安排</h2>
          <p>12 月 5 日为适应性体验日，参赛选手熟悉场地、设备和比赛流程；12 月 6 日为正赛日。正赛时，报名选手经抽签分为若干小组，小组内部进行交叉比赛决出头名，再进入淘汰赛；最终在前四名选手中综合评价选出操作手。</p>
        </div>
      </section>

      <section className="campus-event-section" aria-labelledby="challenge-method-title">
        <div className="campus-section-number">03</div>
        <div>
          <span className="eyebrow">MATCH METHOD</span>
          <h2 id="challenge-method-title">比赛方式</h2>
          <p>比赛提供两台型号不同的步兵机器人，双方操作手分别控制其中一台进行标准 1v1 对抗，共进行两轮。第二轮比赛双方交换机器人，按两轮比赛结束时的机器人剩余血量判定胜负。</p>
        </div>
      </section>

      <section className="campus-event-section" aria-labelledby="challenge-reward-title">
        <div className="campus-section-number">04</div>
        <div>
          <span className="eyebrow">REWARDS</span>
          <h2 id="challenge-reward-title">选拔与奖励</h2>
          <p>综合选拔出的操作手进入后续高校联盟赛步兵对抗赛及 3v3 对抗赛候选操作手名单。排名靠前的选手将获得一等奖、二等奖或三等奖荣誉证书及纪念品奖励。</p>
        </div>
      </section>

      <section className="campus-registration-panel" id="registration" aria-labelledby="challenge-registration-title">
        <div>
          <span className="eyebrow">REGISTRATION</span>
          <h2 id="challenge-registration-title">挑战赛报名</h2>
          <p>报名信息与开放时间将在校内赛公告栏持续更新，赛事负责人将协助完成参赛登记。</p>
        </div>
        <a className="button campus-primary-action" href="#official-group">加入赛事官方群填表报名</a>
        <div className="campus-group-qr" id="official-group">
          <p>加入赛事官方群后填写报名表</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/campus-competition-group-qrcode.jpg" alt="赛事官方群二维码" />
        </div>
      </section>
    </div>
  );
}
