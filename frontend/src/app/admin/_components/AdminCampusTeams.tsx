import type { CampusCompetitionTeam } from "@/lib/api";

export function AdminCampusTeams({ teams }: { teams: CampusCompetitionTeam[] }) {
  return (
    <section className="section admin-section">
      <div className="section-heading">
        <span className="eyebrow">CAMPUS COMPETITION</span>
        <h2>对抗赛参赛队</h2>
      </div>

      <form className="form admin-content-form" action="/api/admin/campus-competition/teams" method="post" encType="multipart/form-data">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="campus-team-name">队伍名称</label>
            <input id="campus-team-name" name="name" maxLength={80} required />
          </div>
          <div className="field">
            <label htmlFor="campus-team-logo">队徽图片</label>
            <input id="campus-team-logo" name="logo" type="file" accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif" />
            <small>支持 JPG、JPEG、PNG、WEBP、GIF，单张不超过 8MB。</small>
          </div>
          <div className="field">
            <label htmlFor="campus-team-order">显示顺序</label>
            <input id="campus-team-order" name="display_order" type="number" min={0} max={9999} defaultValue={teams.length + 1} />
          </div>
        </div>
        <button className="button" type="submit">添加参赛队</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>队伍名称</th>
              <th>队徽链接</th>
              <th>显示顺序</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const formId = `campus-team-${team.id}`;
              return (
                <tr key={team.id}>
                  <td>
                    <form id={formId} action={`/api/admin/campus-competition/teams/${encodeURIComponent(team.id)}`} method="post" encType="multipart/form-data" />
                    <input form={formId} name="name" defaultValue={team.name} maxLength={80} required />
                  </td>
                  <td>
                    {team.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="admin-campus-team-logo" src={team.logo_url} alt={`${team.name}队徽`} />
                    ) : null}
                    <input form={formId} name="logo" type="file" accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif" />
                    <input form={formId} name="logo_url" type="hidden" value={team.logo_url} readOnly />
                    <small>支持 JPG、JPEG、PNG、WEBP、GIF，单张不超过 8MB。</small>
                  </td>
                  <td><input form={formId} name="display_order" type="number" min={0} max={9999} defaultValue={team.display_order} /></td>
                  <td>
                    <div className="row-actions">
                      <button className="ghost-button" form={formId} type="submit">保存</button>
                      <button className="ghost-button" form={formId} name="intent" value="delete" type="submit">删除</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {teams.length === 0 ? <tr><td className="empty-cell" colSpan={4}>当前没有参赛队</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
