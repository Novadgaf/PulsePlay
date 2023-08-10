import { app as electronApp } from "electron";
import { overwolf } from '@overwolf/ow-electron' // TODO: wil be @overwolf/ow-electron
import {
  IOverwolfOverlayApi,
  OverlayWindowOptions,
  OverlayBrowserWindow,
  GamesFilter,
} from '@overwolf/ow-electron-packages-types';
import EventEmitter from "events";

const app = electronApp as overwolf.OverwolfApp;

export class OverlayService extends EventEmitter {
  public get overlayApi(): IOverwolfOverlayApi {
    return (app.overwolf.packages as any).overlay as IOverwolfOverlayApi;
  }

  /**
   *
   */
  constructor() {
    super();
    this.startOverlayWhenPackageReady();
  }


  /**
   *
   */
  public async createNewOsrWindow(
    options: OverlayWindowOptions,
  ): Promise<OverlayBrowserWindow> {
    const overlay = await this.overlayApi.createWindow(options);
    return overlay;
  }

  /**
   *
   *
   */
  public async registerToGames(gameIds: number[]): Promise<void> {
    await new Promise( resolve => setTimeout ( resolve , 2000));

    this.log('registering to game ids:', gameIds);

    const filter: GamesFilter = {
      gamesIds: gameIds,
    };

    await this.overlayApi.registerGames(filter);

    this.log('overlay is registered');
  }

  //----------------------------------------------------------------------------
  private startOverlayWhenPackageReady() {
    app.overwolf.packages.on('ready', (e, packageName) => {
      if (packageName === 'overlay') {
        this.startOverlay();
      }
    });
  }

  //----------------------------------------------------------------------------
  // must be called after package is 'ready' (i.e loaded)
  private startOverlay() {
    if (!this.overlayApi) {
      throw new Error('Attempting to access overlay before available');
    }

    this.log('overlay package is ready');

    this.registerOverlayEvents();

    this.emit('ready');
  }


  private registerOverlayEvents() {
    // prevent double events in case the package relaunch due crash
    // or update.
    //
    // NOTE: If you have another class listening on events, this will remove
    // their listeners as well.
    this.overlayApi.removeAllListeners();

    this.log('registering to overlay package events');

    this.overlayApi.on('game-launched', (event, gameInfo) => {
      this.log('game launched', gameInfo);

      this.emit('injection-decision-handling', event, gameInfo);
    });

    this.overlayApi.on('game-injection-error', (gameInfo, error) => {
      this.log('game-injection-error', error, gameInfo);
    });

    this.overlayApi.on('game-injected', (gameInfo) => {
      this.log('new game injected!', gameInfo);
    });

    this.overlayApi.on('game-focus-changed', (window, game, focus) => {
      this.log('game window focus changes', game.name, focus);
    });

    this.overlayApi.on('game-window-changed', (window, game, reason) => {
      this.log('game window info changed', reason, window);
    });
  }

  /** */
  private log(message: string, ...args: any[]) {
    try {
      this.emit('log', message, ...args);
    } catch {}
  }
}