' Starts the Koas Foods dev server hidden, and keeps it running (scripts/keep-alive.ps1).
' Copy this file into the Windows Startup folder (Win+R, shell:startup) to run it at every login.
' Delete it from there to stop that.
CreateObject("WScript.Shell").Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""C:\Users\91990\OneDrive\Desktop\New Project\koas-foods\scripts\keep-alive.ps1""", 0, False
