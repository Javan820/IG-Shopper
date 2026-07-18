Dim projectDir, port, shell, fso, lockFile, result, i, needStart

projectDir = "d:\Javan\Cluade Code\business\BB OIG Shop"
port       = 3000
lockFile   = projectDir & "\.oig-starting"

Set shell = CreateObject("WScript.Shell")
Set fso   = CreateObject("Scripting.FileSystemObject")

' Remove stale lock (older than 600 s). A first-time production build can take a
' few minutes, so the window is generous — it only guards against a crashed start.
If fso.FileExists(lockFile) Then
    If DateDiff("s", fso.GetFile(lockFile).DateCreated, Now()) > 600 Then
        fso.DeleteFile lockFile
    End If
End If

needStart = False

' 1) Something is listening on the port — verify it actually serves pages before
'    opening the browser. A leftover/zombie server can hold the port while serving
'    nothing, which looks like a crash. If unhealthy: kill it and start fresh.
result = shell.Run("cmd /c netstat -ano | findstr :" & port & " | findstr LISTENING", 0, True)
If result = 0 Then
    Dim httpCheck, healthy
    healthy = False
    Set httpCheck = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    httpCheck.SetTimeouts 3000, 3000, 15000, 15000
    On Error Resume Next
    httpCheck.Open "GET", "http://localhost:" & port & "/", False
    httpCheck.Send
    If Err.Number = 0 Then
        If httpCheck.Status = 200 Then healthy = True
    End If
    Err.Clear
    On Error GoTo 0

    If healthy Then
        shell.Run "http://localhost:" & port
    Else
        shell.Popup "OIG Shop: found a broken server — restarting it. Please wait.", 5, "OIG Shop", 64
        shell.Run "powershell -WindowStyle Hidden -Command ""Get-NetTCPConnection -LocalPort " & port & " -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }""", 0, True
        WScript.Sleep 2000
        If fso.FileExists(lockFile) Then fso.DeleteFile lockFile
        needStart = True
    End If

' 2) Lock exists — another click is already starting it, just wait
ElseIf fso.FileExists(lockFile) Then
    shell.Popup "OIG Shop is already starting — please wait.", 5, "OIG Shop", 64
    For i = 1 To 60
        WScript.Sleep 3000
        result = shell.Run("cmd /c netstat -ano | findstr :" & port & " | findstr LISTENING", 0, True)
        If result = 0 Then Exit For
    Next
    If result = 0 Then
        ' Block until the server is serving a real page
        Dim httpWait
        Set httpWait = CreateObject("MSXML2.ServerXMLHTTP.6.0")
        httpWait.SetTimeouts 5000, 5000, 90000, 90000
        On Error Resume Next
        httpWait.Open "GET", "http://localhost:" & port & "/", False
        httpWait.Send
        Err.Clear
        On Error GoTo 0
        shell.Run "http://localhost:" & port
    End If

' 3) First click — start the server
Else
    needStart = True
End If

If needStart Then
    fso.CreateTextFile(lockFile, True).Close

    ' Production build runs MUCH faster than dev mode. If no build exists yet
    ' (.next\BUILD_ID is created by `next build`, not by dev), build once first.
    ' After code changes, run "Rebuild OIG Shop.vbs" to refresh the build.
    If Not fso.FileExists(projectDir & "\.next\BUILD_ID") Then
        shell.Popup "OIG Shop: building for the first time." & vbCrLf & _
                    "This takes 1-3 minutes and only happens once. Do NOT click again.", _
                    8, "OIG Shop", 64
        ' Cap heap at 1.5 GB — 1 GB caused OOM during compilation.
        ' wait=True: block here until the build finishes before starting.
        shell.Run "cmd /c cd /D """ & projectDir & """ && set NODE_OPTIONS=--max-old-space-size=1536 && npm run build", 0, True
    End If

    shell.Popup "OIG Shop is starting.", 4, "OIG Shop", 64

    ' Start the production server (fast: binds the port within seconds).
    shell.Run "cmd /c cd /D """ & projectDir & """ && set NODE_OPTIONS=--max-old-space-size=1536 && npm run start", 0, False

    ' Phase 1: wait for Node to bind the port (up to 2 min)
    For i = 1 To 60
        WScript.Sleep 2000
        result = shell.Run("cmd /c netstat -ano | findstr :" & port & " | findstr LISTENING", 0, True)
        If result = 0 Then Exit For
    Next

    If fso.FileExists(lockFile) Then fso.DeleteFile lockFile

    If result = 0 Then
        ' Phase 2: block until the server serves HTTP 200, then open the browser
        Dim http
        Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
        http.SetTimeouts 5000, 5000, 120000, 120000
        On Error Resume Next
        http.Open "GET", "http://localhost:" & port & "/", False
        http.Send
        Err.Clear
        On Error GoTo 0
        shell.Run "http://localhost:" & port
        shell.Run "powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & projectDir & "\Stop OIG Shop (Tray).ps1"""
    Else
        MsgBox "OIG Shop could not start." & vbCrLf & _
               "Open a terminal in the project folder and run: npm run build then npm run start", _
               vbExclamation, "OIG Shop Error"
    End If
End If
