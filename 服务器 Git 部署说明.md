# 服务器 Git 部署说明

本方案使用 GitHub 仓库作为代码来源，更新链路为：

本地提交代码 -> 推送到 GitHub -> 本地拉取服务器 `storage` 备份 -> 服务器更新前再次备份 `storage` -> 服务器拉取最新代码 -> Docker Compose 重建容器

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

推荐直接在本地执行受保护更新：

```powershell
.\scripts\sync_server_storage.ps1 -RunServerUpdate
```

这条命令会先把服务器 `~/printk/storage` 拉到本机 `%USERPROFILE%\printk-server-storage-backups\storage\时间戳`，默认保留最近 14 份本地备份，然后通过 SSH 执行服务器上的 `scripts/server-update.sh`。

只拉取服务器 `storage` 备份：

```powershell
.\scripts\sync_server_storage.ps1
```

服务器更新前备份由 `scripts/server-update.sh` 执行，默认写入 `~/printk/storage/backups`，默认保留最近 14 份；需要调整保留数量时使用：

```powershell
.\scripts\sync_server_storage.ps1 -RunServerUpdate -Keep 30 -ServerKeep 30
```

也可以到服务器执行：

```bash
cd ~/printk
bash scripts/server-update.sh
```

## storage 恢复步骤

每次本地拉取成功后，`sync_server_storage.ps1` 会直接打印本次备份对应的恢复命令。手动恢复时按下面顺序执行：

```bash
cd ~/printk
sudo docker compose stop backend frontend nginx
mkdir -p storage/backups
tar -C storage --exclude=./backups -czf storage/backups/pre-restore-$(date +%Y%m%d-%H%M%S).tar.gz .
```

然后在本地把选定备份传回服务器，示例：

```powershell
scp -r "$env:USERPROFILE\printk-server-storage-backups\storage\20260623-233000\*" ubuntu@123.207.16.156:~/printk/storage/
```

最后在服务器重启容器：

```bash
cd ~/printk
sudo docker compose up -d
sudo docker compose ps
```

账号数据在 `storage/system.db`，首页弹幕数据在同一个数据库的 `homepage_danmaku` 表内；恢复 `storage` 会把数据库、上传文件、归档文件、导出文件一起恢复。

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
