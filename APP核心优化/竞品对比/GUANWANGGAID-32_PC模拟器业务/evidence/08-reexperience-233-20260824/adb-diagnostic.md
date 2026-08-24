# ADB 只读诊断（2026-08-24）

执行命令：

```powershell
adb devices -l
adb mdns services
```

输出：

```text
List of devices attached
emulator-5554          offline transport_id:3

List of discovered mdns services
adb-HA2BC162-nfwmX3  _adb-tls-connect._tcp  192.168.31.224:42829
adb-A6EE015B05000045-cK2vef  _adb-tls-connect._tcp  192.168.31.216:34377
```

结论：没有已授权且状态为 `device` 的真机序列号；仅出现一个离线模拟器。发现两项局域网无线调试服务，但未建立连接，无法确认哪一台属于本次测试设备。为遵守“真机不在线即停止”的边界，未执行 `adb connect`，未启动或操作 233 乐园。
