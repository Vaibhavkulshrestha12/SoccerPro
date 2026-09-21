import * as THREE from "three";
import { CameraRig } from "./CameraRig";
import { InputController } from "./InputController";
import { NetworkController } from "./NetworkController";
import { createPitch } from "../environment/Pitch";
import { createSakuraBrickWorld } from "../environment/SakuraBrickWorld";
import { createTeams } from "../entities/Teams";
import { Ball } from "../entities/Ball";
import { MatchController, MatchMode } from "../systems/MatchController";
import { Hud } from "../ui/Hud";
import { MainMenu } from "../ui/MainMenu";
import { PauseMenu } from "../ui/PauseMenu";

type GameState = "menu" | "playing" | "paused";

export class SoccerGame {
  private readonly scene = new THREE.Scene();
  private readonly renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: new URLSearchParams(window.location.search).has("verify"),
    powerPreference: "high-performance"
  });

  private readonly camera = new THREE.PerspectiveCamera(54, 1, 0.1, 320);
  private readonly clock = new THREE.Clock();
  private readonly input = new InputController();
  private readonly hud = new Hud();
  private readonly mainMenu = new MainMenu();
  private readonly pauseMenu = new PauseMenu();
  private readonly cameraRig = new CameraRig(this.camera);
  private readonly ball = new Ball();
  private readonly teams = createTeams();
  private readonly match = new MatchController(
    this.teams.home,
    this.teams.away,
    this.ball,
    this.hud
  );
  private readonly network = new NetworkController();

  private animationFrame = 0;
  private hasRendered = false;
  private state: GameState = "menu";
  private matchMode: MatchMode = "ai";

  constructor(private readonly root: HTMLElement) {
    this.scene.background = new THREE.Color("#c7d7e4");
    this.scene.fog = new THREE.Fog("#c7d7e4", 95, 205);

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.4));
    this.root.append(this.renderer.domElement);

    this.configureLights();
    this.scene.add(createPitch());
    this.scene.add(createSakuraBrickWorld());
    this.scene.add(this.ball.group);
    this.teams.all.forEach((player) => this.scene.add(player.group));

    this.camera.position.set(-24, 30, 28);
    this.resize();
    window.addEventListener("resize", this.resize);

    this.setupMenuCallbacks();
    this.setupPauseCallbacks();
    this.setupHudCallbacks();

    // Start in menu state
    this.hud.hide();
    this.mainMenu.show();
  }

  start(): void {
    this.clock.start();
    this.loop();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrame);
    this.input.dispose();
    this.hud.dispose();
    this.mainMenu.dispose();
    this.pauseMenu.dispose();
    this.network.dispose();
    window.removeEventListener("resize", this.resize);
    this.renderer.dispose();
  }

  private setupMenuCallbacks(): void {
    this.mainMenu.bind({
      onStartAI: () => {
        this.network.onConnected = null;
        this.network.onDisconnected = null;
        this.network.onError = null;
        this.network.dispose();
        this.matchMode = "ai";
        this.match.mode = "ai";
        this.match.restartKickoff(true);
        this.mainMenu.hide();
        this.hud.show();
        this.state = "playing";
      },

      onStart1v1: async (sessionId: string, isHost: boolean) => {
        this.matchMode = "1v1";
        this.match.mode = "1v1";
        this.network.onError = (message) => {
          this.quitToMenu();
          this.mainMenu.showSessionStatus(`Error: ${message}`);
          this.mainMenu.showInfo("SESSION UNAVAILABLE", message);
        };

        try {
          if (isHost) {
            const id = await this.network.createSession();
            this.mainMenu.showSessionId(id);
            this.mainMenu.showSessionStatus("Waiting for opponent to join...");

            this.network.onConnected = () => {
              this.mainMenu.hideSessionStatus();
              this.match.restartKickoff(true, true);
              this.mainMenu.hide();
              this.hud.show();
              this.state = "playing";
            };
          } else {
            this.mainMenu.showSessionStatus("Connecting...");
            await this.network.joinSession(sessionId);
            this.mainMenu.hideSessionStatus();
            this.match.restartKickoff(true, true);
            this.mainMenu.hide();
            this.hud.show();
            this.state = "playing";
          }

          this.network.onDisconnected = () => {
            this.hud.showToast("Opponent disconnected");
            setTimeout(() => {
              this.quitToMenu();
            }, 2000);
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Connection failed";
          this.network.dispose();
          this.mainMenu.showSessionStatus(`Error: ${message}`);
          this.mainMenu.showInfo("CONNECTION FAILED", message);
        }
      }
    });
  }

  private setupPauseCallbacks(): void {
    this.pauseMenu.bind({
      onResume: () => {
        this.resumeMatch();
      },
      onQuit: () => {
        this.quitToMenu();
      }
    });
  }

  private setupHudCallbacks(): void {
    this.hud.onPauseClick = () => {
      if (this.state === "playing") {
        this.pauseMatch();
      }
    };
  }

  private pauseMatch(): void {
    this.state = "paused";
    this.match.pause();
    this.pauseMenu.show();
  }

  private resumeMatch(): void {
    this.state = "playing";
    this.match.resume();
    this.pauseMenu.hide();
  }

  private quitToMenu(): void {
    this.state = "menu";
    this.match.resume(); // ensure unpaused for next match
    this.pauseMenu.hide();
    this.hud.hide();
    this.mainMenu.show();
    this.network.dispose();
    this.match.restartKickoff(true, true);
  }

  private readonly loop = () => {
    const delta = Math.min(this.clock.getDelta(), 1 / 30);
    const input = this.input.update();

    // Handle pause toggle via Escape
    if (input.pausePressed && this.state === "playing") {
      this.pauseMatch();
    } else if (input.pausePressed && this.state === "paused") {
      this.resumeMatch();
    }

    if (this.state === "playing") {
      if (this.matchMode === "1v1" && this.network.connected) {
        // Send local input to remote
        this.network.sendInput(input);

        // Determine which input goes to which team
        const isHost = this.network.role === "host";
        const homeInput = isHost ? input : this.network.remoteInput;
        const awayInput = isHost ? this.network.remoteInput : input;

        this.match.update(delta, homeInput, awayInput);
      } else {
        this.match.update(delta, input);
      }
    }

    // Always render (even when paused/menu for the background)
    this.cameraRig.update(delta, this.match.selectedPlayer, this.ball);
    this.renderer.render(this.scene, this.camera);

    if (!this.hasRendered) {
      this.hasRendered = true;
      window.__SOCCER_11V11_READY__ = true;
    }

    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private readonly resize = () => {
    const width = this.root.clientWidth || window.innerWidth;
    const height = this.root.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.cameraRig.resize(width, height);
  };

  private configureLights(): void {
    const hemisphere = new THREE.HemisphereLight("#e8f2ff", "#2b3f2d", 1.8);
    this.scene.add(hemisphere);

    const sun = new THREE.DirectionalLight("#fff0d0", 3.2);
    sun.position.set(-36, 58, 28);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -90;
    sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 150;
    this.scene.add(sun);
  }
}
