# A Lit Component That Turns Images Into Drag Drop Puzzles

## Summary

A Lit based web component that turns provided images into simple drag and drop puzzles.

* The component code is in `./js`
* All remaining files are a demonstration of the component:
  * `demo.html` is the demo page
  * `./images` are sample images used by the demo page

This is my first Lit component, so I wouldn't advise using this as an example of best practices. But please do enjoy it for what it is :)

### Properties

| Property | Type | Description |
|--|--|--|
| `src` | String | Path to the image that you want to turn into a puzzle |
| `desiredNumberOfPieces` | Integer | Desired number of pieces. *Desired* because actual number of pieces may vary slightly depending on the dimensions of the image used. Must be >=4 and <= 64. If not set this will default to 16 |
| `borderColour` | String | Edge pieces of an unsolved puzzle are given a border that will be this colour. If not set, or not a valid HTML colour, this will default to white. |

### Events

`componentStateChanged`: this event will fire any time the component state changes.

The component has a getter `componentStates` which returns the possible state values:

* **no_image_source_set** : the component is loaded but there is no image source set
* **loading_image** : the component is in the process of loading the image
* **error** : the component tried to load an image but had an error doing so
* **loaded** : the component has fully loaded an image and turned it into a puzzle

Compare *event.detail.state* to these values in order to determine the current state.

### Functions

`shufflePieces()` : call to shuffle the puzzle

`solvePuzzle()` : call to solve the puzzle

### Slots

| Slot | Description |
|--|--|
| `no_image_source_message` | displayed when there is no image source set |
| `currently_loading_image_message` | displayed when the image is in the process of loading |
| `error_loading_image_message` | displayed if an error is encountered while loading the image |

### Usage

Provide the component the source to an image, and the desired number of pieces.
The component will try to load the image.
Listen to the *componentStateChanged* event to determine state.
Optionally provide slots if you want custom messages displayed for each state.
When loaded an image puzzle will scale to fill its parent container.
Drag one piece over another to swap them.
Continue to solve the puzzle.
Change border colour, shuffle pieces, or automatically solve as desired.

### System Requirements and Known Issues

Developed and tested for Chrome 114+, but also seems to work well in Firefox 114+ and Edge 114+.
In Safari 16.5+ the experience is degraded as there are no drag/drop ghost images, but it does seem to work otherwise.
Experienced best on non-mobile devices, but did seem to work ok on a Galaxy S22, so YMMV.
