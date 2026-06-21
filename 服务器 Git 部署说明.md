# 服务器 Git 部署说明

本方案使用 GitHub 仓库作为代码来源，更新链路为：

本地提交代码 -> 推送到 GitHub -> 服务器拉取最新代码 -> Docker Compose 重建容器

## 一次性准备

服务器登录后先生成专用 SSH 密钥：

```bash
ssh-keygen -t ed25519 -C "printk-server"
```

一路回车即可，然后查看公钥：

```bash
cat ~/.ssh/id_ed25519.pub
```

复制输出内容，到 GitHub 仓库 `Settings -> Deploy keys -> Add deploy key` 添加。

建议：

- `Title` 填 `printk-server`
- `Allow write access` 不勾选

添加后在服务器测试：

```bash
ssh -T git@github.com
```

第一次会提示确认指纹，输入 `yes`。

## 首次部署

```bash
git clone -b master git@github.com:threfire/printk_web.git ~/printk
cd ~/printk
bash scripts/server-init.sh
```

脚本第一次运行会自动生成 `.env`，然后停止，接着编辑：

```bash
cd ~/printk
nano .env
```

至少修改这些值：

- `FRONTEND_ORIGIN`
- `NEXT_PUBLIC_API_BASE_URL`
- `ADMIN_PASSWORD`
- `GROUP_LEADER_PASSWORD`
- `SECRET_KEY`

保存后重新执行：

```bash
bash scripts/server-init.sh
```

## 后续更新

本地完成代码修改后执行：

```bash
git add .
git commit -m "写你的更新说明"
git push origin master
```

然后到服务器执行：

```bash
cd ~/printk
bash scripts/server-update.sh
```

## 常用检查

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

## 当前仓库默认分支

当前默认按 `master` 分支部署。
