# 物资入库与发票管理系统

本系统提供以下闭环：

1. 成员通过网页上传采购表格。
2. 本地审核脚本定期审核未入库批次并推入待入库队列。
3. 管理员通过密码登录后台后确认入库、查看库内结果、提取出库报销。

## 运行方式

```powershell
python app.py
```

一键启动：

```text
双击 启动服务.bat
```

首次启动会自动创建 `.venv` 并安装依赖，耗时会比后续启动更长。

停止服务：

```text
双击 停止服务.bat
```

启动失败时查看日志：

```text
storage/logs/server_stdout.log
storage/logs/server_stderr.log
```

默认地址：

```text
http://本机局域网IP:5000
```

上传模板下载：

```text
http://本机局域网IP:5000/downloads/template
```

管理员后台登录地址：

```text
http://本机局域网IP:5000/admin/login
```

默认管理员密码：

```text
admin123
```

如需修改管理员密码：

```powershell
$env:ADMIN_PASSWORD="你的新密码"
python app.py
```

默认监听地址：

```text
0.0.0.0:5000
```

如需改端口或地址：

```powershell
$env:APP_HOST="0.0.0.0"
$env:APP_PORT="5000"
python app.py
```

## 当前实现范围

- 上传 `xlsx` 表格
- 本地脚本自动审核
- 发票号码重复校验
- 管理员按批次或按明细确认入库
- 管理员按明细提取出库
- SQLite 本地数据库
- 库内总表与出库总表自动导出
