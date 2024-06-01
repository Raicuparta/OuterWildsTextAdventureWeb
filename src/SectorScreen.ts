import { Button } from "./Button";
import { DatabaseObserver } from "./DatabaseScreen";
import { Actor } from "./Entity";
import { ExploreData } from "./ExploreData";
import { ExploreScreen } from "./ExploreScreen";
import { NodeButtonObserver, OWNode } from "./Node";
import { NodeActionObserver, NodeAction, ProbeAction, TravelAction, ExploreAction } from "./NodeAction";
import { NodeConnection } from "./NodeConnection";
import { Clue } from "./PlayerData";
import { OWScreen } from "./Screen";
import { Sector } from "./Sector";
import { SectorEditor } from "./SectorEditor";
import { gameManager, feed, timeLoop, EDIT_MODE, mediumFontData, smallFont } from "./app";

export class SectorScreen extends OWScreen implements NodeButtonObserver, NodeActionObserver, DatabaseObserver
{
  _player: Actor;
  _ship: Actor;
  _sector: Sector;
  
  _editor: SectorEditor;
  
  _focusNode: OWNode;

  _databaseButton: Button;
  _liftoffButton: Button;
  _secondaryActionButton: Button;
  _primaryActionButton: Button;
  _waitButton: Button;
  _telescopeButton: Button;

  _actionlessPrompt: string = "inaccessible";
  _actions: NodeAction[];

  constructor(sector: Sector, player: Actor, ship: Actor)
  {
    super();
    
    this._actions = new Array<NodeAction>();
    this._editor = new SectorEditor(sector);
    
    this._player = player;
    this._ship = ship;
    this._sector = sector;

    this.addButtonToToolbar(this._databaseButton = new Button("Use Database", 0, 0, 150, 50));
    this.addButtonToToolbar(this._telescopeButton = new Button("Scan for Signals", 0, 0, 150, 50));
    this._telescopeButton.setDisabledPrompt("Scan for Signals\n(view obstructed)");

    this.addButtonToToolbar(this._waitButton  = new Button("Wait [1 min]", 0, 0, 150, 50));
    this.addButtonToToolbar(this._liftoffButton  = new Button("Leave Sector", 0, 0, 150, 50));
    this.addButtonToToolbar(this._primaryActionButton  = new Button("Move", 0, 0, 75, 50));
    this.addButtonToToolbar(this._secondaryActionButton  = new Button("Probe", 0, 0, 75, 50));
    this._liftoffButton.setDisabledPrompt("Leave Sector\n(must be at ship)");
  }

  onEnter(): void
  {
    this._sector.addNodeButtonObserver(this);
    this._sector.addNodeButtonObserver(this._editor);
    this._sector.updateNodeRanges(this.isPlayerInShip(), this._player.currentNode);

    if (this._focusNode != null) {
      this._focusNode.isFocused = false;
    }
    this._focusNode = null;
  }
  
  onExit(): void
  {
    this._sector.removeAllNodeButtonObservers();
  }

  onButtonUp(button: Button): void
  {
    if (button == this._databaseButton)
    {
      gameManager.databaseScreen.setObserver(this);
      gameManager.pushScreen(gameManager.databaseScreen);
    }
    else if (button == this._liftoffButton)
    {
      this._sector.removeActor(this._player);
      this._sector.removeActor(this._ship);
      gameManager.loadSolarSystemMap();
      feed.clear();
      feed.publish("you leave " + this._sector.getName());
    }
    else if (button == this._telescopeButton)
    {
      gameManager.loadTelescopeView();
    }
    else if (button == this._waitButton)
    {
      timeLoop.waitFor(1);
    }
    else if (button == this._primaryActionButton)
    {
      this._actions
        .filter(action => action._mouseButton === LEFT)
        .forEach(action => action.execute());
    }
    else if (button == this._secondaryActionButton)
    {
      this._actions
        .filter(action => action._mouseButton === RIGHT)
        .forEach(action => action.execute());
    }
  }

  onInvokeClue(clue: Clue): void
  {
    // check for node-specific clue effects
    if (this._player.currentNode != null && this._player.currentNode.isExplorable())
    {
      const exploreData: ExploreData = this._player.currentNode.getExploreData();
      exploreData.parseJSON();

      if (exploreData.canClueBeInvoked(clue.id))
      {
        gameManager.popScreen(); // force-quit the database screen
        gameManager.pushScreen(new ExploreScreen(this._player.currentNode)); // push on a new explorescreen
        exploreData.invokeClue(clue.id);
        exploreData.explore();
        return;
      }
    }
    
    // next try the whole sector
    if (this._player.currentSector != null && this._player.currentSector.canClueBeInvoked(clue))
    {
      this._player.currentSector.invokeClue(clue);
    }
    else
    {
      feed.publish("that doesn't help you right now", true);
    }
  }

  update(): void
  {
    // update action button visibility
    this._liftoffButton.enabled = (this._player.currentNode == this._ship.currentNode);
    this._telescopeButton.enabled = (this._player.currentNode != null && this._player.currentNode.allowTelescope && this._player.currentSector.allowTelescope());
    this._primaryActionButton.enabled = this._focusNode != null && this._player.currentNode != this._focusNode && this._focusNode.inRange();
    this._secondaryActionButton.enabled = this._focusNode != null && this._player.currentNode != this._focusNode && this._focusNode.inRange() && this._focusNode.isProbeable();

    this._sector.update();
    if (EDIT_MODE) this._editor.update();
  }

  renderBackground(): void
  {
    super.renderBackground();
    this._sector.renderBackground();
  }

  render(): void
  {
    this._sector.render();
    feed.render();
    timeLoop.renderTimer();

    fill(0, 0, 100);
    textSize(18);
    textFont(mediumFontData);
    textAlign(RIGHT);
    text(this._sector.getName(),width - 20, height - 100);

    if (!this.active) return;
    if (EDIT_MODE) this._editor.render();

    // this.drawNodeGUI(this._focusNode, this._actions);
  }

  drawNodeGUI(target: OWNode, actions: NodeAction[]): void
  {
    if (target == null || (this._actions.length == 0 && target == this._player.currentNode)) {return;}

    smallFont();

    const yOffset: number = 60;
    let promptWidth: number = textWidth(this._actionlessPrompt);

    // find prompt width
    for (let i: number = 0; i < actions.length; i++) 
    {
      promptWidth = max(promptWidth, textWidth(actions[i].getPrompt()));
    }

    // draw box
    stroke(200, 100, 100);
    fill(0, 0, 0);
    rectMode(CORNER);
    rect(target.screenPosition.x - promptWidth * 0.5 - 10, target.screenPosition.y + yOffset - 15, promptWidth + 15, max(20, 20 * actions.length) + 10);

    // draw prompts
    fill(0, 0, 100);
    textAlign(LEFT, CENTER);

    for (let i: number = 0; i < actions.length; i++) 
    {
      text(actions[i].getPrompt(), target.screenPosition.x - promptWidth * 0.5, target.screenPosition.y + yOffset + 20 * i);
    }

    if (actions.length == 0)
    {
      text(this._actionlessPrompt, target.screenPosition.x - promptWidth * 0.5, target.screenPosition.y + yOffset);
    }
  }

  onTravelAttempt(succeeded: boolean, node: OWNode, connection: NodeConnection): void{}
  onExploreNode(node: OWNode): void{}
  onProbeNode(node: OWNode): void{}

  onNodeSelected(node: OWNode): void
  {
    /** EXCECUTE ACTION **/
    // for (let i: number = 0; i < this._actions.length; i++) 
    // {
    //   if (this._actions[i].getMouseButton() == mouseButton)
    //   {
    //     this._actions[i].execute();
    //     break;
    //   }
    // }

    this.refreshAvailableActions();
  }
  
  onNodeGainFocus(node: OWNode): void
  {
    if (this._focusNode != null) {
      this._focusNode.isFocused = false;
    }
    this._focusNode = node;
    if (this._focusNode != null) {
      this._focusNode.isFocused = true;
    }
    this.refreshAvailableActions();
  }
  
  onNodeLoseFocus(node: OWNode): void
  {
    if (node == this._focusNode)
    {
      if (this._focusNode != null) {
        this._focusNode.isFocused = false;
      }
      this._focusNode = null;
      this.refreshAvailableActions();
    }
  }

  refreshAvailableActions(): void
  {
    this._actions.length = 0;

    if (this._focusNode == null) 
    {
      return;
    }

    if (this._player.currentNode != this._focusNode)
    {
      if (this._focusNode.inRange())
      {
        if (this._focusNode.isProbeable())
        {
          this._actions.push(new ProbeAction(RIGHT, this._player, this._focusNode, this));
        }
        
        if (this.isPlayerInShip() && this._focusNode.shipAccess)
        {
          this._actions.push(new TravelAction(LEFT, this._player, this._ship, this._focusNode, this));
        }
        else
        {
          this._actions.push(new TravelAction(LEFT, this._player, null, this._focusNode, this));
        }
      }
    }
    else
    {
      if (this._focusNode.isExplorable())
      {
        this._actions.push(new ExploreAction(LEFT, this._focusNode, this));
      }
    }
  }

  isPlayerInShip(): boolean
  {
    return(this._player.currentNode == this._ship.currentNode);
  }
}
