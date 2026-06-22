# PRINTK 团队门户与发票管理系统

本项目已经从单体 Flask 方案推进到 `Next.js + FastAPI + Docker Compose + Nginx` 架构，当前代码与服务器部署链路已经打通。

## 当前项目结构

```text
frontend/     Next.js 前端，负责团队门户、图片工具、账号页面、发票管理页面、管理后台页面
backend/      FastAPI 后端，负责接口、SQLite、本地文件处理、审核逻辑
deploy/nginx/ Nginx 反向代理配置
storage/      本地数据目录，存放数据库、上传文件、导出文件、日志
scripts/      本地开发脚本、服务器初始化脚本、服务器更新脚本
app.py        迁移前 Flask 版本保留文件，仅作参考
docker-compose.yml
```

## 当前功能状态

- 团队门户首页
- 队员账号注册、登录、资料维护
- 赛季规划页面与接口
- 发票模板下载
- 成员上传 `.xlsx` 采购表格
- 本地审核与入库流程
- 管理后台批次确认、驳回、出库
- 图片工具页面
- GitHub 仓库拉取部署
- Docker Compose 容器部署
- Nginx 反向代理入口

## 当前部署状态

当前服务器已经完成首次部署，运行方式如下：

- 云服务器：腾讯云轻量应用服务器
- 操作系统：Ubuntu 22.04 Docker 镜像
- 公网 IP：`123.207.16.156`
- SSH 登录模板：`ssh ubuntu@123.207.16.156`
- 域名：`gzuprintk.cn`
- DNS：
  - `@ -> 123.207.16.156`
  - `www -> 123.207.16.156`

当前容器：

- `printk-backend`
- `printk-frontend`
- `printk-nginx`

当前访问入口：

- IP 入口：`http://123.207.16.156`
- 域名入口：`http://gzuprintk.cn`
- 域名入口：`http://www.gzuprintk.cn`
- 后端健康检查：`http://123.207.16.156:8000/api/health`

当前反向代理链路：

`用户访问 80 端口 -> Nginx -> frontend:3000 / backend:8000`

## 当前部署文件

- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `deploy/nginx/default.conf`
- `scripts/server-init.sh`
- `scripts/server-update.sh`
- `.env.server.example`

## 服务器环境变量现状

服务器 `.env` 当前至少包含以下字段：

```env
FRONTEND_ORIGIN=http://123.207.16.156,http://gzuprintk.cn,http://www.gzuprintk.cn
INTERNAL_API_BASE_URL=http://backend:8000
NEXT_PUBLIC_API_BASE_URL=/
ADMIN_PASSWORD=***
GROUP_LEADER_PASSWORD=***
SECRET_KEY=***
```

说明：

- `NEXT_PUBLIC_API_BASE_URL=/` 表示浏览器通过同域 `/api` 访问接口
- `INTERNAL_API_BASE_URL=http://backend:8000` 表示前端容器内部走 Docker 网络访问后端
- `FRONTEND_ORIGIN` 已放行 IP 与域名来源

## 本地开发方式

本地一键启动：

```text
启动全栈服务.bat
```

本地默认入口：

```text
前端：http://127.0.0.1:3000
后端：http://127.0.0.1:8000/api/health
```

本地一键停止：

```text
停止全栈服务.bat
```

## 服务器首次部署流程

服务器使用 GitHub 仓库部署，当前链路已经验证通过。

```bash
git clone -b master git@github.com:threfire/printk_web.git ~/printk
cd ~/printk
bash scripts/server-init.sh
```

第一次执行会生成 `.env`，编辑完成后再次执行：

```bash
cd ~/printk
bash scripts/server-init.sh
```

## 后续更新流程

当前推荐更新链路：

`本地改代码 -> git commit -> git push origin master -> 服务器 git pull -> docker compose 重建`

本地执行：

```bash
git add .
git commit -m "写本次更新说明"
git push origin master
```

服务器执行：

```bash
cd ~/printk
bash scripts/server-update.sh
```

如果只想手动更新，也可以执行：

```bash
cd ~/printk
git pull origin master
sudo docker compose up -d --build
```

## 常用运维命令

查看容器状态：

```bash
cd ~/printk
sudo docker compose ps
```

查看前端日志：

```bash
cd ~/printk
sudo docker compose logs frontend --tail=100
```

查看后端日志：

```bash
cd ~/printk
sudo docker compose logs backend --tail=100
```

查看 Nginx 日志：

```bash
cd ~/printk
sudo docker compose logs nginx --tail=100
```

重建全部容器：

```bash
cd ~/printk
sudo docker compose up -d --build
```

## 当前已知事项

- 当前网站已经可以通过公网 IP 和域名访问
- 当前 `80` 端口已由 Nginx 接管
- 当前 `3000` 与 `8000` 仍对外开放，便于排错；后续可在稳定后收敛入口
- 当前域名已完成解析
- 当前仍应继续推进 ICP 备案
- 当前尚未接入 HTTPS

## 下一步待办

- 完成 ICP 备案
- 接入 HTTPS
- 稳定后收紧安全组，只保留必要端口
- 持续完善门户页面内容
- 持续完善发票与后台流程

## 数据保护约束

数据库 = `storage/system.db` 及部署环境中承载同等业务数据的数据库文件或数据库服务。

业务数据 = 已注册账号、账号资料、账号权限、账号日志、发票上传记录、采购明细、发票登记、报销记录、论坛内容、首页内容、首页弹幕记录、上传文件、归档文件、导出文件。

后端容器必须通过 `STORAGE_DIR=/app/storage` 读写 Docker 挂载目录，`docker-compose.yml` 必须保持 `./storage:/app/storage` 挂载。

代码改动、依赖更新、部署脚本更新、容器配置更新必须保留现有业务数据。

涉及数据库结构时，只允许使用保留数据的迁移路径：新增字段、新增索引、新增表、补充默认值、可回滚的数据迁移脚本。

禁止执行会清空、覆盖、重建或删除现有业务数据的操作，包括删除 `storage/system.db`、删除 `storage/` 下的业务目录、执行 `DROP TABLE`、执行 `TRUNCATE`、用空库覆盖线上库、用测试种子数据覆盖真实数据、删除 Docker 数据卷。

涉及账号系统时，必须保留 `site_account` 的账号主键、密码哈希、姓名、身份状态、权限、停用状态、创建时间、更新时间、最后登录时间及关联日志。

涉及发票系统时，必须保留上传批次、采购明细、发票号码、发票登记、审核状态、报销记录、上传原文件、归档文件和导出文件。

涉及首页弹幕时，必须保留 `homepage_danmaku` 的弹幕主键、图片标识、图片地址、账号、昵称、内容、轨道、颜色、创建时间和播放参数。代码更新只能新增兼容字段或调整读取方式，不能用图片地址变更、轮播图替换或数量裁剪删除已有弹幕记录。

首页弹幕显示必须按 `homepage_danmaku.image_key` 隔离，单张图片只读取和展示该图片稳定标识对应的弹幕记录。

需要调整表结构时，先生成备份，再执行迁移，再验证核心表行数和关键字段可读。备份文件必须存放在 `storage/backups/` 或部署环境约定的备份目录。

本地测试需要重置数据时，只能使用独立测试数据库或临时目录，路径必须与 `storage/system.db` 和线上数据目录分离。

任何自动化脚本默认以保护现有数据为前提；脚本包含危险数据库操作时，必须要求人工显式确认目标路径、备份路径和恢复方式。
