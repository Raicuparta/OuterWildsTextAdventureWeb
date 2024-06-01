import { Color } from "p5";
import { ButtonObserver, Button } from "./Button";
import { Entity } from "./Entity";
import { Vector2 } from "./Vector2";
import { playerData } from "./app";

export abstract class OWScreen implements ButtonObserver
{
  static RIGHT_MARGIN: number = 200;

  active: boolean = false;
  overlay: boolean = false;

  _buttons: Button[];
  _toolbarButtons: Button[];
  _starPositions: Vector2[];

  _toolbarRoot: Entity;
  
  constructor()
  {
    this._buttons = new Array<Button>();
    this._toolbarButtons = new Array<Button>();
    this._starPositions = new Array<Vector2>(1000);
    
    for (let i: number = 0; i < this._starPositions.length; i++)
    {
      this._starPositions[i] = new Vector2(random(0, width), random(0, height));
    }

    this._toolbarRoot = new Entity(width - 100, 0);
  }
  
  addButton(button: Button): void
  {
    this._buttons.push(button);
    button.setObserver(this);
  }
  
  removeButton(button: Button): void
  {
    if (this._buttons.includes(button)) {
      this._buttons.splice(this._buttons.indexOf(button), 1);
    }
  }

  addButtonToToolbar(button: Button): void
  {
    this.addButton(button);
    this._toolbarButtons.push(button);
    this._toolbarRoot.addChild(button);
    this.updateToolbarPositions();
  }

  removeButtonFromToolbar(button: Button): void
  {
    this.removeButton(button);
    this._toolbarButtons.splice(this._toolbarButtons.indexOf(button), 1);
    this._toolbarRoot.removeChild(button);
    this.updateToolbarPositions();
  }

  updateToolbarPositions(): void
  {
    const margins: number = 10;
    let toolbarHeight: number = -margins;

    for (let i: number = 0; i < this._toolbarButtons.length; i++)
    {
      toolbarHeight += margins;
      toolbarHeight += this._toolbarButtons[i].getHeight();
    }

    let yPos: number = height - 150;

    for (let i: number = 0; i < this._toolbarButtons.length; i++)
    {
      yPos -= margins;
      const buttonHalfHeight: number = this._toolbarButtons[i].getHeight() * 0.5;
      yPos -= buttonHalfHeight;
      this._toolbarButtons[i].setPosition(0, yPos);
      yPos -= buttonHalfHeight;
    }
  }
  
  abstract update(): void;
  abstract render(): void;
  
  onEnter(): void{}
  onExit(): void{}
  
  onButtonUp(button: Button): void{}
  onButtonEnterHover(button: Button): void{}
  onButtonExitHover(button: Button): void{}
  
  updateInput(): void
  {
    for (let i: number = 0; i < this._buttons.length; i++)
    {
      this._buttons[i].update();
    }
  }
  
  renderBackground(): void
  {
    let bgColor: Color = color(0, 0, 0);
    let starColor: Color = color(0, 0, 100, 50);

    // superhack to invert colors when player is at EYE_OF_THE_UNIVERSE
    if (playerData.isPlayerAtEOTU())
    {
      bgColor = color(0, 0, 100);
      starColor = color(0, 0, 0);
    }

    background(bgColor);
    noStroke();
    
    /** DRAW STARFIELD **/
    for (let j: number = 0; j < this._starPositions.length; j++)
    {
      fill(starColor);
      rectMode(CENTER);
      rect(this._starPositions[j].x, this._starPositions[j].y, 2, 2);
    }
  }
  
  renderButtons(): void
  {
    // only render buttons if the screen is active
    if (this.active)
    {
      for (let i: number = 0; i < this._buttons.length; i++)
      {
        this._buttons[i].render();
      }
    }
  }
}
