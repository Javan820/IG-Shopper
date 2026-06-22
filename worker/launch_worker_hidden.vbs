' Starts the shop-discovery worker with NO visible window.
' The Startup shortcut points here so the worker runs in the background
' at every login, with no terminal window. run_worker.bat self-locates via %~dp0.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")
q = Chr(34)
batPath = fso.GetParentFolderName(WScript.ScriptFullName) & "\run_worker.bat"
sh.Run q & batPath & q, 0, False
