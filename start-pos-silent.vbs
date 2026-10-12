' POS Server Silent Launcher
' This script runs the POS server in the background without showing a console window
' It auto-detects its own location, so it works from any folder on any PC

Dim WshShell, scriptDir
Set WshShell = CreateObject("WScript.Shell")

' Auto-detect the folder where this script is located
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = scriptDir
WshShell.Run "cmd /c node server.js", 0, False

Set WshShell = Nothing
