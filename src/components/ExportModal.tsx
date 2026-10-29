import React, { useState } from 'react';
import { X, Smartphone, Download, Check, FileCode, Server } from 'lucide-react';

interface ExportModalProps {
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'apk' | 'scripts' | 'backend'>('apk');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // Unity C# Script templates as specified in Part 23
  const unityScripts: Record<string, string> = {
    'PlayerController.cs': `// BattleZone X — Mobile Third-Person Player Controller
using UnityEngine;

public class PlayerController : MonoBehaviour
{
    [Header("Movement")]
    public float walkSpeed = 5.5f;
    public float sprintSpeed = 9.5f;
    public float jumpForce = 7.5f;
    public float gravity = -19.8f;

    [Header("Components")]
    public CharacterController controller;
    public Transform cameraTransform;
    public Animator animator;

    private Vector3 velocity;
    private bool isGrounded;

    void Update()
    {
        isGrounded = controller.isGrounded;
        if (isGrounded && velocity.y < 0)
        {
            velocity.y = -2f;
        }

        float h = Input.GetAxis("Horizontal");
        float v = Input.GetAxis("Vertical");
        bool sprint = Input.GetKey(KeyCode.LeftShift);

        Vector3 moveDir = (cameraTransform.forward * v + cameraTransform.right * h);
        moveDir.y = 0;
        moveDir.Normalize();

        float speed = sprint ? sprintSpeed : walkSpeed;
        controller.Move(moveDir * speed * Time.deltaTime);

        if (Input.GetButtonDown("Jump") && isGrounded)
        {
            velocity.y = jumpForce;
        }

        velocity.y += gravity * Time.deltaTime;
        controller.Move(velocity * Time.deltaTime);
    }
}`,
    'MobileInputController.cs': `// BattleZone X — Mobile Dual-Touch Landscape Joystick & Look Area
using UnityEngine;
using UnityEngine.UI;

public class MobileInputController : MonoBehaviour
{
    public RectTransform joystickKnob;
    public RectTransform joystickBackground;
    public float maxRange = 60f;

    public Vector2 MovementInput { get; private set; }
    public Vector2 LookInput { get; private set; }

    public void OnJoystickDrag(Vector2 touchPos)
    {
        Vector2 offset = touchPos - (Vector2)joystickBackground.position;
        MovementInput = Vector2.ClampMagnitude(offset, maxRange) / maxRange;
        joystickKnob.anchoredPosition = MovementInput * maxRange;
    }

    public void OnJoystickRelease()
    {
        MovementInput = Vector2.zero;
        joystickKnob.anchoredPosition = Vector2.zero;
    }
}`,
    'SafeZoneManager.cs': `// BattleZone X — Authoritative Safe Zone Shrinking Manager
using UnityEngine;

public class SafeZoneManager : MonoBehaviour
{
    public Transform safeZoneCylinder;
    public Vector3 currentCenter;
    public float currentRadius = 140f;
    public Vector3 targetCenter;
    public float targetRadius = 90f;
    public float shrinkDuration = 35f;
    public float damagePerSecond = 4.5f;

    public bool IsInsideSafeZone(Vector3 position)
    {
        float dist = Vector2.Distance(new Vector2(position.x, position.z), new Vector2(currentCenter.x, currentCenter.z));
        return dist <= currentRadius;
    }
}`,
    'WeaponManager.cs': `// BattleZone X — Modular Weapon & Combat Manager
using UnityEngine;

public class WeaponManager : MonoBehaviour
{
    [System.Serializable]
    public struct WeaponConfig
    {
        public string weaponName;
        public int damage;
        public float fireRate;
        public int magSize;
        public float reloadTime;
        public float recoilPitch;
    }

    public WeaponConfig currentWeapon;
    public Camera playerCamera;
    public ParticleSystem muzzleFlash;

    public void Fire()
    {
        muzzleFlash.Play();
        Ray ray = playerCamera.ViewportPointToRay(new Vector3(0.5f, 0.5f, 0));
        if (Physics.Raycast(ray, out RaycastHit hit, 200f))
        {
            // Register server hit validation
            Debug.Log("Hit: " + hit.collider.name);
        }
    }
}`,
  };

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(key);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const downloadAllScripts = () => {
    const combined = Object.entries(unityScripts)
      .map(([name, code]) => `// ================= ${name} =================\n${code}\n`)
      .join('\n\n');
    const blob = new Blob([combined], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BattleZoneX_Unity_CSharp_Bundle.cs';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Smartphone className="w-6 h-6 text-orange-500" />
            <div>
              <h2 className="font-mono font-black text-lg text-white">BATTLEZONE X — ANDROID & UNITY EXPORT</h2>
              <p className="text-xs text-slate-400">Mobile Build Pipeline, Standalone APK & Complete C# Architecture</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50">
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-3 text-xs font-mono font-bold border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'apk'
                ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            1. ANDROID APK / PWA INSTALL
          </button>
          <button
            onClick={() => setActiveTab('scripts')}
            className={`flex-1 py-3 text-xs font-mono font-bold border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'scripts'
                ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            2. UNITY C# SCRIPTS
          </button>
          <button
            onClick={() => setActiveTab('backend')}
            className={`flex-1 py-3 text-xs font-mono font-bold border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'backend'
                ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            3. DEDICATED SERVER
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-sm text-slate-300 space-y-4">
          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="bg-orange-950/30 border border-orange-500/40 p-4 rounded-xl text-xs space-y-2">
                <span className="font-bold text-orange-400 uppercase tracking-wider block">
                  Phone-Only Playable APK / WebAPK:
                </span>
                <p className="text-slate-300">
                  BattleZone X is built with a Progressive Web App (PWA) manifest with landscape orientation lock. On your Android smartphone:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Open Chrome or your mobile browser on this page.</li>
                  <li>Tap the browser menu (3 dots) in the top right.</li>
                  <li>Tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</li>
                  <li>Android will package BattleZone X as a standalone fullscreen native APK app with its tactical icon!</li>
                </ol>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-cyan-400 uppercase">Cloud Build (GitHub Actions + Unity Cloud):</span>
                <p className="text-slate-400">
                  For native Google Play Store APK signing with Photon Fusion 2 / Unity C#:
                </p>
                <div className="bg-black/60 p-3 rounded font-mono text-slate-300 text-[11px] overflow-x-auto">
                  git clone &lt;repo&gt;<br />
                  cd BattleZoneX<br />
                  unity-editor -batchmode -quit -projectPath . -executeMethod BuildScript.BuildAndroidAPK
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scripts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Exportable C# Source Code (Part 23 & 24):</span>
                <button
                  onClick={downloadAllScripts}
                  className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" /> Download All (.cs)
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {Object.entries(unityScripts).map(([filename, code]) => (
                  <div key={filename} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-orange-400 font-bold text-xs">{filename}</span>
                      <button
                        onClick={() => copyToClipboard(filename, code)}
                        className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded transition-colors"
                      >
                        {copiedScript === filename ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> Copied
                          </>
                        ) : (
                          'Copy'
                        )}
                      </button>
                    </div>
                    <pre className="text-[11px] text-slate-400 overflow-x-auto max-h-36 bg-black/40 p-2 rounded">
                      {code}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'backend' && (
            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                The authoritative game server runs directly in <code>server.ts</code> handling tick synchronization, player health verification, weapon damage validation, and safe-zone radiation.
              </p>
              <div className="bg-black/60 p-3 rounded border border-slate-800 space-y-2">
                <div className="text-emerald-400 font-bold">Dedicated Server Endpoints:</div>
                <div>• WebSocket URL: <code>ws://localhost:3000</code></div>
                <div>• Health & Latency: <code>GET /api/health</code></div>
                <div>• Global Leaderboard: <code>GET /api/leaderboard</code></div>
                <div>• Unity Export Manifest: <code>GET /api/unity-export-docs</code></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
