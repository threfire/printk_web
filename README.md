# PRINTK 团队门户与发票管理系统

本项目正在从单体 Flask 系统迁移为 `Next.js + FastAPI` 架构。

## 当前结构

```text
frontend/     Next.js 前端，负责团队门户、发票上传、管理后台页面
backend/      FastAPI 后端，负责接口、SQLite、本地文件和审核脚本
storage/      本地数据目录，不提交 Git
scripts/      一键启动和停止脚本
app.py        迁移前 Flask 版本，作为基线参考保留
```

## 一键启动

双击：

```text
启动全栈服务.bat
```

默认地址：

```text
前端：http://127.0.0.1:3000
后端：http://127.0.0.1:8000/api/health
```

停止服务：

```text
停止全栈服务.bat
```

## 密码配置

管理员密码：

```powershell
$env:ADMIN_PASSWORD="你的管理员密码"
```

组长密码：

```powershell
$env:GROUP_LEADER_PASSWORD="你的组长密码"
```

## 当前功能

- 团队门户首页
- 发票表格模板下载
- 成员上传 `.xlsx` 采购表格
- 后端本地审核脚本
- 管理员登录
- 待入库批次确认
- 库内明细提取出库
- SQLite 本地数据库

## 后续开发目标

- 赛季月度规划数据表和管理后台
- 机器人展示按赛季归档
- 队员风采真实姓名和照片管理
- 近期动态富文本编辑
- 外网访问加固
