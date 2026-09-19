import "./styles.css";
import { SoccerGame } from "./core/SoccerGame";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app root");
}

const game = new SoccerGame(root);
game.start();

declare global {
  interface Window {
    soccerGame?: SoccerGame;
    __SOCCER_11V11_READY__?: boolean;
  }
}

window.soccerGame = game;
