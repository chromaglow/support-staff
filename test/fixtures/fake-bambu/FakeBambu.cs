// Stand-in for Bambu Studio in the smoke test. The test compiles this with the .NET
// Framework csc.exe that ships with Windows into <tmp>\bambu-studio.exe (the settings
// validator requires that basename), and the app launches it exactly as it would the
// real slicer. It writes its arguments, one per line, to the file named by
// FAKE_BAMBU_LOG and exits 0. No Node, no NODE_OPTIONS, so it works for the packaged
// build too (packaged Electron strips NODE_OPTIONS from the environment).
using System;
using System.IO;

static class FakeBambu
{
    static int Main(string[] args)
    {
        string log = Environment.GetEnvironmentVariable("FAKE_BAMBU_LOG");
        if (!string.IsNullOrEmpty(log)) File.WriteAllText(log, string.Join("\n", args));
        return 0;
    }
}
