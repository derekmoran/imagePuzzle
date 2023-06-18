// A Lit component that turns images into drag and drop puzzles
// Derek Moran 2023

import { html, css, LitElement, styleMap } from './lit-all.min.js';

export class ImagePuzzle extends LitElement {

    static styles = css`
        :host {
            display: inline-block;
            position: absolute;
            width: 100%;
            height: 100%;
        }

        .absolute_centered {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }

        #puzzle_grid {
            display: grid;
            place-items: center;
        }

        #puzzle_grid div:hover {
            filter: hue-rotate(90deg);
            touch-action: none;
            cursor: move;
        }

        .rotate_hue {
            filter: hue-rotate(90deg);
        }

        // Required for safari
        [draggable=true] {
            -khtml-user-drag: element;
            -webkit-user-drag: element;
            -khtml-user-select: none;
            -webkit-user-select: none;
        }

        @keyframes piece_moved_animation_frames {
            to {
                transform: rotate(360deg);
            }
        }

        @keyframes puzzle_solved_animation_frames {
            0%, 7% {
                transform: rotateZ(0) scale(1);
            }
            15% {
                transform: rotateZ(-15deg) scale(0.9);
            }
            20% {
                transform: rotateZ(10deg) scale(0.8);
            }
            25% {
                transform: rotateZ(-10deg) scale(0.7);
            }
            30% {
                transform: rotateZ(6deg) scale(0.8);
            }
            35% {
                transform: rotateZ(-4deg) scale(0.9);
            }
            40%, 100% {
                transform: rotateZ(0) scale(1);
            }
        }
    `;

    get componentStates() {
        return {
            no_image_source_set: 'no_image_source_set',
            loading_image: 'image_loading',
            error: 'error_loading',
            loaded: 'image_loaded'
        }
    }

    static _propertyDefaults = {
        src: null,
        numberOfPieces: '16',
        borderColour: 'white'
    }

    static properties = {
        src: {
            converter: ( value ) => {
                let attributeValue = String( value ).trim();

                if( attributeValue.length == 0 ) {
                    return ImagePuzzle._propertyDefaults.src;
                }

                return attributeValue;
            }
        },

        desiredNumberOfPieces: {
            converter: ( value ) => {
                let attributeValue = parseInt( value );

                if( isNaN( attributeValue ) || attributeValue < 4 || attributeValue > 64 ) {
                    return ImagePuzzle._propertyDefaults.numberOfPieces;
                }

                return Number( value );
            }
        },

        borderColour: {
            converter: ( value ) => {
                let attributeValue = String( value ).trim();

                const style = new Option().style;
                style.color = attributeValue;

                if( style.color === '' ) {
                    return ImagePuzzle._propertyDefaults.borderColour;
                }

                return attributeValue;
            }
        }
    };

    constructor() {
        super();

        this.src = ImagePuzzle._propertyDefaults.src;
        this.desiredNumberOfPieces = ImagePuzzle._propertyDefaults.numberOfPieces;
        this.borderColour = ImagePuzzle._propertyDefaults.borderColour;

        this.resizeObserver = new ResizeObserver( () => { this._resize() } );

        this._imageNotLoadedStates = {
            loading: undefined,
            errorLoading: null
        }
        this._defaultActualImageState = this._imageNotLoadedStates.loading;
        this._defaultPuzzleImageState = {
            width: 0,
            height: 0
        };
        this._defaultPuzzleLayoutState = {
            numRows: 0,
            numCols: 0,
            positionsById: new Set(),
            stylesById: new Set(),
            unsolvedPiecesById: new Set()
        };

        this._state = {
            // State of the actual image
            actualImage: this._defaultActualImageState,

            // State of the image after it has been scaled to best fit the puzzle container
            puzzleImage: this._defaultPuzzleImageState,

            // State of the current layout of the image after it has been turned into a puzzle
            puzzleLayout: this._defaultPuzzleLayoutState
        }
    }

    connectedCallback() {
        super.connectedCallback()
        this.resizeObserver.observe(this);
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this.resizeObserver.unobserve(this);
    }

    render() {
        let state = this._state;

        if( this.src == ImagePuzzle._propertyDefaults.src ) {
            this._triggerComponentStateChangedEvent( this.componentStates.no_image_source_set );
            return html`<span class="absolute_centered"><slot name="no_image_source_message"><p>No image source has been set</p></slot></span>`;
        }

        if ( state.actualImage === this._imageNotLoadedStates.loading ) {
            this._triggerComponentStateChangedEvent( this.componentStates.loading_image );
            return html`<span class="absolute_centered"><slot name="currently_loading_image_message"><p>Image is loading ...</p></slot></span>`;
        }

        if ( state.actualImage === this._imageNotLoadedStates.errorLoading ) {
            this._triggerComponentStateChangedEvent( this.componentStates.error );
            return html`<span class="absolute_centered"><slot name="error_loading_image_message"><p>Error: unable to load image</p></slot></span>`;
        }

        let puzzlePieceTemplatesList = [];

        for( const pieceId in state.puzzleLayout.positionsById ) {

            let pieceIdAtPosition = state.puzzleLayout.positionsById[pieceId];
            let pieceStyle = state.puzzleLayout.stylesById[pieceIdAtPosition];

            puzzlePieceTemplatesList.push(
                html `
                <div
                    id="${pieceId}"
                    style="${styleMap( pieceStyle )}"
                    draggable="true"
                    @dragstart="${this._dragstart}"
                    @dragover="${this._dragover}"
                    @dragenter="${this._dragenter}"
                    @dragleave="${this._dragleave}"
                    @drop="${this._drop}"
                >`
            );
        }

        let gridStyle = {
            gridTemplate: `repeat(${state.puzzleLayout.numRows}, 1fr) / repeat(${state.puzzleLayout.numCols}, 1fr)`,
            width: `${state.puzzleImage.width}px`,
            height: `${state.puzzleImage.height}px`
        };

        this._triggerComponentStateChangedEvent( this.componentStates.loaded );
        return html`<span id="puzzle_grid" class="absolute_centered" style="${styleMap( gridStyle )}">${puzzlePieceTemplatesList}</span>`;
    }

    updated( changedProperties ) {

        if( changedProperties.size == 0 ) {
            return;
        }

        let hasImageChanged = changedProperties.has( 'src') && this.src != ImagePuzzle._propertyDefaults.src;

        // Reset state so that we'll get a proper loading message if another image is already in play
        if ( hasImageChanged && this._state.actualImage !== this._imageNotLoadedStates.loading ) {
            this._state.actualImage = this._imageNotLoadedStates.loading;
            this.requestUpdate();
        }

        this._updateActualImageState( hasImageChanged )
        .then( () => {
                this._updatePuzzleImageState();
                let updateNumberOfPieces = changedProperties.has( 'src') || changedProperties.has( 'desiredNumberOfPieces' );
                this._updatePuzzleLayoutState( updateNumberOfPieces );
                if ( updateNumberOfPieces ) {
                    this.shufflePieces();
                }
                this.requestUpdate();
            }
        );
    }

    shufflePieces() {
        if( !this._state.actualImage ) {
            return;
        }

        let positionsById = this._state.puzzleLayout.positionsById;
        let unsolvedPiecesById = this._state.puzzleLayout.unsolvedPiecesById;

        do {
            let positionKeys = Object.keys( positionsById );
            let shuffledPositionKeys = positionKeys.sort( () => Math.random() - 0.5 );

            let i = 0;
            for( let key in positionsById ) {
                positionsById[key] = shuffledPositionKeys[i];
                if( positionsById[key] != key && !unsolvedPiecesById.has( key ) ) {
                    unsolvedPiecesById.add( key );
                } else if ( unsolvedPiecesById.has( key ) ) {
                    unsolvedPiecesById.delete( key );
                }
                i++;
            }
        } while( unsolvedPiecesById.size == 0 );

        const updateNumberOfPieces = false;
        this._updatePuzzleLayoutState( updateNumberOfPieces );
        this.requestUpdate();
      }

    solvePuzzle() {
        if( !this._state.actualImage ) {
            return;
        }

        let puzzleLayoutState = this._state.puzzleLayout;

        for ( let row = 1; row <= puzzleLayoutState.numRows; row++ ) {
            for ( let col = 1; col <= puzzleLayoutState.numCols; col++ ) {
                let pieceId = this._getPieceId( row, col );
                puzzleLayoutState.positionsById[pieceId] = pieceId;
            }
        }

        puzzleLayoutState.unsolvedPiecesById.clear();

        const updateNumberOfPieces = false;
        this._updatePuzzleLayoutState( updateNumberOfPieces );

        this.requestUpdate();
    }

    _resize() {
        this._updatePuzzleImageState();

        const updateNumberOfPieces = false;
        this._updatePuzzleLayoutState( updateNumberOfPieces );

        this.requestUpdate();
    }

    _triggerComponentStateChangedEvent( componentState ) {
        let event = new CustomEvent(
            'componentStateChanged',
            {
                composed: true,
                bubbles: true,
                cancelable: true,
                detail: { state: componentState }
            }
        );
        this.dispatchEvent( event );
    }

    _dragstart( event ) {
        event.dataTransfer.setData( 'text', event.target.id );
        event.dataTransfer.effectAllowed = "move";
        return true; // Required by safari
    }

    _dragenter( event ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        event.target.classList.add( 'rotate_hue' );
        return true; // Required by safari
    }

    _dragleave( event ) {
        event.target.classList.remove( 'rotate_hue' );
    }

    _dragover( event ) {
        event.preventDefault();
        return true; // Required by safari
    }

    _drop( event ) {
        event.target.classList.remove( 'rotate_hue' );
        let sourcePiecePositionId = event.dataTransfer.getData( 'text' );
        let targetPiecePositionId = event.target.id;

        let positionsById = this._state.puzzleLayout.positionsById;

        let sourcePieceId = positionsById[sourcePiecePositionId];
        let targetPieceId = positionsById[targetPiecePositionId];

        positionsById[sourcePiecePositionId] = targetPieceId;
        positionsById[targetPiecePositionId] = sourcePieceId;

        let targetPosition = this.renderRoot.getElementById( sourcePiecePositionId );
        let sourcePosition = this.renderRoot.getElementById( targetPiecePositionId );

        let unsolvedPiecesById = this._state.puzzleLayout.unsolvedPiecesById;
        let currentUnsolvedPiecesCount = unsolvedPiecesById.size;

        if( positionsById[sourcePiecePositionId] == sourcePiecePositionId && unsolvedPiecesById.has( sourcePiecePositionId ) ) {
            unsolvedPiecesById.delete( sourcePiecePositionId );
        }

        if( positionsById[sourcePiecePositionId] != sourcePiecePositionId && !unsolvedPiecesById.has( sourcePiecePositionId ) ) {
            unsolvedPiecesById.add( sourcePiecePositionId );
        }

        if( positionsById[targetPiecePositionId] == targetPiecePositionId && unsolvedPiecesById.has( targetPiecePositionId ) ) {
            unsolvedPiecesById.delete( targetPiecePositionId );
        }

        if( positionsById[targetPiecePositionId] != targetPiecePositionId && !unsolvedPiecesById.has( targetPiecePositionId ) ) {
            unsolvedPiecesById.add( targetPiecePositionId );
        }

        if ( unsolvedPiecesById.size > 0 ) {
            setTimeout( () => {
                targetPosition.style.animation = sourcePosition.style.animation = 'initial';
                this._triggerReflow( targetPosition );
                this._triggerReflow( sourcePosition );
                targetPosition.style.animation = sourcePosition.style.animation = 'piece_moved_animation_frames 250ms';
            });
        }

        if ( currentUnsolvedPiecesCount != unsolvedPiecesById.size ) {
            const updateNumberOfPieces = false;
            this._updatePuzzleLayoutState( updateNumberOfPieces );
        }

        this.requestUpdate();
    }

    _triggerReflow( element ) {
        void element.offsetWidth; // Causes browsers to re-calculate positions and geometries of element, which allows css animations to re-trigger
    }

    _getPieceId( row, col ) {
        return `p_${row}_${col}`;
    }

    _updatePuzzleLayoutState( updateNumberOfPieces ) {

        let puzzleImageState = this._state.puzzleImage;
        let puzzleLayoutState = this._state.puzzleLayout;

        if ( updateNumberOfPieces ) {
            puzzleLayoutState = this._state.puzzleLayout = structuredClone( this._defaultPuzzleLayoutState );
            let desiredPieceSize = Math.sqrt( puzzleImageState.height * puzzleImageState.width / this.desiredNumberOfPieces );
            if ( puzzleImageState.height > puzzleImageState.width ) {
                puzzleLayoutState.numRows = parseInt( puzzleImageState.height / desiredPieceSize );
                puzzleLayoutState.numCols = parseInt( this.desiredNumberOfPieces / puzzleLayoutState.numRows );
            } else {
                puzzleLayoutState.numCols = parseInt( puzzleImageState.width / desiredPieceSize );
                puzzleLayoutState.numRows = parseInt( this.desiredNumberOfPieces / puzzleLayoutState.numCols );
            }
        }

        let isPuzzleSolved = puzzleLayoutState.unsolvedPiecesById.size == 0;

        let borderSizePx = isPuzzleSolved ? 0 : 2;

        let pieceWidthPx = ( puzzleImageState.width / puzzleLayoutState.numCols ) - borderSizePx * 2;
        let pieceHeightPx = ( puzzleImageState.height / puzzleLayoutState.numRows ) - borderSizePx * 2;

        let backgroundSizeWidthPx = puzzleImageState.width - borderSizePx * 2 * puzzleLayoutState.numCols;
        let backgroundSizeHeightPx = puzzleImageState.height - borderSizePx * 2 * puzzleLayoutState.numRows;

        for ( let row = 1; row <= puzzleLayoutState.numRows; row++ ) {
            for ( let col = 1; col <= puzzleLayoutState.numCols; col++ ) {

                let pieceId = this._getPieceId( row, col );
                if ( !( pieceId in puzzleLayoutState.positionsById ) ) {
                    puzzleLayoutState.positionsById[pieceId] = pieceId;
                }

                puzzleLayoutState.stylesById[pieceId] = {
                    width: `${pieceWidthPx}px`,
                    height: `${pieceHeightPx}px`,
                    backgroundImage: `url('${this.src}')`,
                    backgroundPositionX: `${(col - 1)*-pieceWidthPx}px`,
                    backgroundPositionY: `${(row - 1)*-pieceHeightPx}px`,
                    backgroundSize: `${backgroundSizeWidthPx}px ${backgroundSizeHeightPx}px`,
                    borderColor: this.borderColour,
                    borderWidth: `${borderSizePx}px`,
                    borderStyle: `${row == 1 ? 'solid' : 'hidden'} ${col == puzzleLayoutState.numCols ? 'solid' : 'hidden'} ${row == puzzleLayoutState.numRows ? 'solid' : 'hidden'} ${col == 1 ? 'solid' : 'hidden'}`
                };

                if ( isPuzzleSolved ) {
                    puzzleLayoutState.stylesById[pieceId].animation = 'puzzle_solved_animation_frames 3s';
                }

            }
        }

    }

    // Because I'm using sprites I couldn't see an obvious way to make the css grid automatically size for them.
    // But I may have just missed something, in which case doing this myself is some serious overkill. :)
    _updatePuzzleImageState() {

        let imageState = this._state.actualImage;
        if( !imageState ) {
            return;
        }

        let puzzleImageState = this._state.puzzleImage = this._defaultPuzzleImageState;

        puzzleImageState.width = imageState.width;
        puzzleImageState.height = imageState.height;

        let aspectRatio = imageState.width / imageState.height;

        if( puzzleImageState.height < this.clientHeight && puzzleImageState.width < this.clientWidth ) {
            puzzleImageState.width = this.clientWidth;
            puzzleImageState.height = puzzleImageState.width / aspectRatio;
        }

        if ( puzzleImageState.width > this.clientWidth ) {
            puzzleImageState.width = this.clientWidth;
            puzzleImageState.height = puzzleImageState.width / aspectRatio;
        }

        if ( puzzleImageState.height > this.clientHeight ) {
            puzzleImageState.height = this.clientHeight;
            puzzleImageState.width = puzzleImageState.height * aspectRatio;
        }

    }

    async _updateActualImageState( hasImageChanged ) {

        if ( !hasImageChanged ) {
            return Promise.resolve();
        }

        let tryLoadImagePromise =  new Promise(
            ( resolve, reject ) => {
                const image = new Image();
                image.src = this.src;
                image.onload = () => resolve( image );
                image.onerror = () => reject();
            }
        );

        try {
            const loadedImage = await tryLoadImagePromise;
            const currentImage = new Image();
            currentImage.src = this.src;

            // This can happen if user changes their image choice before a prior one has completed
            // If the prior one took longer to load we may also be getting here out of order
            // So in such a case we don't want their earlier image overriding the latest!
            if ( currentImage.src !== loadedImage.src ) {
                return;
            }

            this._state.actualImage = {
                width: loadedImage.naturalWidth,
                height: loadedImage.naturalHeight
            }
        } catch {
            this._state.actualImage = this._imageNotLoadedStates.errorLoading;
        }

    }

}

customElements.define( 'image-puzzle', ImagePuzzle );
