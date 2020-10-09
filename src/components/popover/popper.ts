import {
  root,
  addClass,
  addAttributes,
  getOffsetParent,
  isFixed,
  setStylePx,
  getOffsetRectRelativeToCustomParent,
  getOuterSizes,
  getScrollParent,
  getOffsetRect,
  isFunction,
  getArrayKeyIndex,
  getSupportedPropertyName,
  getPopperClientRect,
  getOppositePlacement
} from "./utils/dom";

/**
 * popper工具
 */
export class Popper {
  public _reference?: Element;
  public _popper: Element;
  // 存放Popper参数
  public _options: any = {
    // placement of the popper
    placement: "bottom",

    gpuAcceleration: true,

    // shift popper from its origin by the given amount of pixels (can be negative)
    offset: 0,

    // the element which will act as boundary of the popper
    boundariesElement: "viewport",

    // amount of pixel used to define a minimum distance between the boundaries and the popper
    boundariesPadding: 5,

    // popper will try to prevent overflow following this order,
    // by default, then, it could overflow on the left and on top of the boundariesElement
    preventOverflowOrder: ["left", "right", "top", "bottom"],

    // the behavior used by flip to change the placement of the popper
    flipBehavior: "flip",

    arrowElement: "[x-arrow]",

    arrowOffset: 0,

    // list of functions used to modify the offsets before they are applied to the popper
    modifiers: [
      "shift",
      "offset",
      "preventOverflow",
      "keepTogether",
      "arrow",
      "flip",
      "applyStyle"
    ],

    modifiersIgnored: [],

    forceAbsolute: false
  };
  // 存放Popper状态
  public state: any = {};
  constructor(reference: any, popper: any, options: any) {
    this._reference = reference;
    this._popper = popper;

    let isNotDefined = typeof popper === "undefined" || popper === null;
    let isConfig = popper && Object.prototype.toString.call(popper) === "[object Object]";
    if (isNotDefined || isConfig) {
      this._popper = this.parse(isConfig ? popper : {});
    }
    // otherwise, use the given HTMLElement as popper
    else {
      this._popper = popper;
    }

    // we create a new object with the options inside it
    this._options = Object.assign({}, this._options, options);

    // refactoring modifiers' list
    this._options.modifiers = this._options.modifiers.map((modifier: any) => {
      // remove ignored modifiers
      if (this._options.modifiersIgnored.indexOf(modifier) !== -1) return;

      // set the x-placement attribute before everything else because it could be used to add margins to the popper
      // margins needs to be calculated to get the correct popper offsets
      if (modifier === "applyStyle") {
        this._popper.setAttribute("x-placement", this._options.placement);
      }

      // return predefined modifier identified by string or keep the custom one
      // @ts-ignore
      return this[modifier] || modifier;
    });

    // make sure to apply the popper position before any computation
    this.state.position = this._getPosition(this._reference!);
    setStylePx(this._popper, { position: this.state.position, top: 0 });

    // fire the first update to position the popper in the right place
    this.update();

    // setup event listeners, they will take care of update the position in specific situations
    this._setupEventListeners();
  }

  public _getPosition(reference: Element) {
    if (this._options.forceAbsolute) {
      return "absolute";
    }

    // Decide if the popper will be fixed
    // If the reference element is inside a fixed context, the popper will be fixed as well to allow them to scroll together
    var isParentFixed = isFixed(reference);
    // @ts-ignore
    return isParentFixed ? "fixed" : "absolute";
  }

  public update() {
    var data: any = { instance: this, styles: {} };

    // store placement inside the data object, modifiers will be able to edit `placement` if needed
    // and refer to _originalPlacement to know the original value
    data.placement = this._options.placement;
    data._originalPlacement = this._options.placement;

    // compute the popper and reference offsets and put them inside data.offsets
    data.offsets = this._getOffsets(
      this._popper,
      this._reference!,
      data.placement
    );

    // get boundaries
    data.boundaries = this._getBoundaries(
      data,
      this._options.boundariesPadding,
      this._options.boundariesElement
    );

    data = this.runModifiers(data, this._options.modifiers);

    if (typeof this.state.updateCallback === "function") {
      this.state.updateCallback(data);
    }
  }

  public runModifiers(data: any, modifiers: any, ends?: any) {
    var modifiersToRun = modifiers.slice();
    if (ends !== undefined) {
      modifiersToRun = this._options.modifiers.slice(
        0,
        getArrayKeyIndex(this._options.modifiers, ends)
      );
    }

    modifiersToRun.forEach(
      ((modifier: any) => {
        // @ts-ignore
        if (isFunction(modifier)) {
          data = modifier.call(this, data);
        }
      })
    );

    return data;
  }

  public _getOffsets(popper: Element, reference: Element, placement: string) {
    placement = placement.split("-")[0];
    var popperOffsets: any = {};

    popperOffsets.position = this.state.position;
    var isParentFixed = popperOffsets.position === "fixed";

    //
    // Get reference element position
    //
    var referenceOffsets: any = getOffsetRectRelativeToCustomParent(
      reference,
      getOffsetParent(popper),
      isParentFixed
    );

    //
    // Get popper sizes
    //
    var popperRect: any = getOuterSizes(popper);

    //
    // Compute offsets of popper
    //

    // depending by the popper placement we have to compute its offsets slightly differently
    if (["right", "left"].indexOf(placement) !== -1) {
      popperOffsets.top =
        referenceOffsets.top +
        referenceOffsets.height / 2 -
        popperRect.height / 2;
      if (placement === "left") {
        popperOffsets.left = referenceOffsets.left - popperRect.width;
      } else {
        popperOffsets.left = referenceOffsets.right;
      }
    } else {
      popperOffsets.left =
        referenceOffsets.left +
        referenceOffsets.width / 2 -
        popperRect.width / 2;
      if (placement === "top") {
        popperOffsets.top = referenceOffsets.top - popperRect.height;
      } else {
        popperOffsets.top = referenceOffsets.bottom;
      }
    }

    // Add width and height to our offsets object
    popperOffsets.width = popperRect.width;
    popperOffsets.height = popperRect.height;

    return {
      popper: popperOffsets,
      reference: referenceOffsets
    };
  }
  /**
   * Setup needed event listeners used to update the popper position
   * @method
   * @memberof Popper
   * @access private
   */
  public _setupEventListeners() {
    // NOTE: 1 DOM access here
    this.state.updateBound = this.update.bind(this);
    root.addEventListener("resize", this.state.updateBound);
    // if the boundariesElement is window we don't need to listen for the scroll event
    if (this._options.boundariesElement !== "window") {
      var target: any = getScrollParent(this._reference);
      // here it could be both `body` or `documentElement` thanks to Firefox, we then check both
      if (
        target === root.document.body ||
        target === root.document.documentElement
      ) {
        target = root;
      }
      target.addEventListener("scroll", this.state.updateBound);
      this.state.scrollTarget = target;
    }
  }

  /**
   * Remove event listeners used to update the popper position
   * @method
   * @memberof Popper
   * @access private
   */
  public _removeEventListeners() {
    // NOTE: 1 DOM access here
    root.removeEventListener("resize", this.state.updateBound);
    if (
      this._options.boundariesElement !== "window" &&
      this.state.scrollTarget
    ) {
      this.state.scrollTarget.removeEventListener(
        "scroll",
        this.state.updateBound
      );
      this.state.scrollTarget = null;
    }
    this.state.updateBound = null;
  }
  public _getBoundaries(data: any, padding: any, boundariesElement: any) {
    // NOTE: 1 DOM access here
    var boundaries: any = {};
    var width, height;
    if (boundariesElement === "window") {
      var body = root.document.body,
        html = root.document.documentElement;

      height = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );
      width = Math.max(
        body.scrollWidth,
        body.offsetWidth,
        html.clientWidth,
        html.scrollWidth,
        html.offsetWidth
      );

      boundaries = {
        top: 0,
        right: width,
        bottom: height,
        left: 0
      };
    } else if (boundariesElement === "viewport") {
      var offsetParent: any = getOffsetParent(this._popper);
      var scrollParent: any = getScrollParent(this._popper);
      var offsetParentRect: any = getOffsetRect(offsetParent);

      // Thanks the fucking native API, `document.body.scrollTop` & `document.documentElement.scrollTop`
      var getScrollTopValue = (element: Element) => {
        return element == document.body
          ? Math.max(
              document.documentElement.scrollTop,
              document.body.scrollTop
            )
          : element.scrollTop;
      };
      var getScrollLeftValue = (element: Element) => {
        return element == document.body
          ? Math.max(
              document.documentElement.scrollLeft,
              document.body.scrollLeft
            )
          : element.scrollLeft;
      };

      // if the popper is fixed we don't have to substract scrolling from the boundaries
      var scrollTop =
        data.offsets.popper.position === "fixed"
          ? 0
          : getScrollTopValue(scrollParent);
      var scrollLeft =
        data.offsets.popper.position === "fixed"
          ? 0
          : getScrollLeftValue(scrollParent);

      boundaries = {
        top: 0 - (offsetParentRect.top - scrollTop),
        right:
          root.document.documentElement.clientWidth -
          (offsetParentRect.left - scrollLeft),
        bottom:
          root.document.documentElement.clientHeight -
          (offsetParentRect.top - scrollTop),
        left: 0 - (offsetParentRect.left - scrollLeft)
      };
    } else {
      if (getOffsetParent(this._popper) === boundariesElement) {
        boundaries = {
          top: 0,
          left: 0,
          right: boundariesElement.clientWidth,
          bottom: boundariesElement.clientHeight
        };
      } else {
        boundaries = getOffsetRect(boundariesElement);
      }
    }
    boundaries.left += padding;
    boundaries.right -= padding;
    boundaries.top = boundaries.top + padding;
    boundaries.bottom = boundaries.bottom - padding;
    return boundaries;
  }
  /**
   * If a function is passed, it will be executed after the initialization of popper with as first argument the Popper instance.
   * @method
   * @memberof Popper
   * @param {Function} callback
   */
  public onCreate(callback: any) {
    // the createCallbacks return as first argument the popper instance
    callback(this);
    return this;
  }

  /**
   * If a function is passed, it will be executed after each update of popper with as first argument the set of coordinates and informations
   * used to style popper and its arrow.
   * NOTE: it doesn't get fired on the first call of the `Popper.update()` method inside the `Popper` constructor!
   * @method
   * @memberof Popper
   * @param {Function} callback
   */
  public onUpdate(callback: any) {
    this.state.updateCallback = callback;
    return this;
  }

  /**
   * 没传popper的时候
   * @param config 配置参数
   */
  public parse(config: any) {
    let defaultConfig = {
      tagName: "div",
      classNames: ["popper"],
      attributes: [],
      parent: document.body,
      content: "",
      contentType: "text",
      arrowTagName: "div",
      arrowClassNames: ["popper__arrow"],
      arrowAttributes: ["x-arrow"]
    };
    config = Object.assign({}, defaultConfig, config);

    let d = document;

    let popper = d.createElement(config.tagName);
    addClass(popper, config.classNames);
    addAttributes(popper, config.attributes);
    if (config.contentType === "node") {
      popper.appendChild(config.content);
    } else if (config.contentType === "html") {
      popper.innerHTML = config.content;
    } else {
      popper.textContent = config.content;
    }

    if (config.arrowTagName) {
      let arrow = d.createElement(config.arrowTagName);
      addClass(arrow, config.arrowClassNames);
      addAttributes(arrow, config.arrowAttributes);
      popper.appendChild(arrow);
    }

    let parent = config.parent;

    // if the given parent is a string, use it to match an element
    // if more than one element is matched, the first one will be used as parent
    // if no elements are matched, the script will throw an error
    if (typeof parent === "string") {
      parent = d.querySelectorAll(config.parent);
      if (parent.length > 1) {
        console.warn(
          "WARNING: the given `parent` query(" +
            config.parent +
            ") matched more than one element, the first one will be used"
        );
      }
      if (parent.length === 0) {
        throw 'ERROR: the given `parent` doesn\'t exists!';
      }
      parent = parent[0];
    }
    // if the given parent is a DOM nodes list or an array of nodes with more than one element,
    // the first one will be used as parent
    if (parent.length > 1 && parent instanceof Element === false) {
      console.warn(
        "WARNING: you have passed as parent a list of elements, the first one will be used"
      );
      parent = parent[0];
    }

    // append the generated popper to its parent
    parent.appendChild(popper);

    return popper;
  }

  /**
   * Apply the computed styles to the popper element
   * @method
   * @memberof modifiers
   * @argument {Object} data - The data object generated by `update` method
   * @returns {Object} The same data object
   */
  public applyStyle(data: any) {
    // apply the final offsets to the popper
    // NOTE: 1 DOM access here
    var styles: any = {
      position: data.offsets.popper.position
    };

    // round top and left to avoid blurry text
    var left = Math.round(data.offsets.popper.left);
    var top = Math.round(data.offsets.popper.top);

    // if gpuAcceleration is set to true and transform is supported, we use `translate3d` to apply the position to the popper
    // we automatically use the supported prefixed version if needed
    var prefixedProperty;

    if (
      // @ts-ignore
      this._options.gpuAcceleration &&
      (prefixedProperty = getSupportedPropertyName("transform"))
    ) {
      styles[prefixedProperty] =
        "translate3d(" + left + "px, " + top + "px, 0)";
      styles.top = 0;
      styles.left = 0;
    }
    // othwerise, we use the standard `left` and `top` properties
    else {
      styles.left = left;
      styles.top = top;
    }

    // any property present in `data.styles` will be applied to the popper,
    // in this way we can make the 3rd party modifiers add custom styles to it
    // Be aware, modifiers could override the properties defined in the previous
    // lines of this modifier!
    Object.assign(styles, data.styles);

    setStylePx(this._popper, styles);

    // set an attribute which will be useful to style the tooltip (use it to properly position its arrow)
    // NOTE: 1 DOM access here
    this._popper.setAttribute("x-placement", data.placement);

    // if the arrow modifier is required and the arrow style has been computed, apply the arrow style
    if (
      this.isModifierRequired(this.applyStyle, this.arrow) &&
      data.offsets.arrow
    ) {
      setStylePx(data.arrowElement, data.offsets.arrow);
    }

    return data;
  }

  /**
   * Modifier used to shift the popper on the start or end of its reference element side
   * @method
   * @memberof Popper.modifiers
   * @argument {Object} data - The data object generated by `update` method
   * @returns {Object} The data object, properly modified
   */
  public shift(data: any) {
    var placement = data.placement;
    var basePlacement = placement.split("-")[0];
    var shiftVariation = placement.split("-")[1];

    // if shift shiftVariation is specified, run the modifier
    if (shiftVariation) {
      var reference: any = data.offsets.reference;
      var popper: any = getPopperClientRect(data.offsets.popper);

      var shiftOffsets: any = {
        y: {
          start: { top: reference.top },
          end: { top: reference.top + reference.height - popper.height }
        },
        x: {
          start: { left: reference.left },
          end: { left: reference.left + reference.width - popper.width }
        }
      };

      var axis = ["bottom", "top"].indexOf(basePlacement) !== -1 ? "x" : "y";

      data.offsets.popper = Object.assign(
        popper,
        shiftOffsets[axis][shiftVariation]
      );
    }

    return data;
  }

  /**
   * Modifier used to make sure the popper does not overflows from it's boundaries
   * @method
   * @memberof Popper.modifiers
   * @argument {Object} data - The data object generated by `update` method
   * @returns {Object} The data object, properly modified
   */
  public preventOverflow(data: any) {
    var order: any = this._options.preventOverflowOrder;
    var popper: any = getPopperClientRect(data.offsets.popper);

    var check: any = {
      left: function() {
        var left = popper.left;
        if (popper.left < data.boundaries.left) {
          left = Math.max(popper.left, data.boundaries.left);
        }
        return { left: left };
      },
      right: function() {
        var left = popper.left;
        if (popper.right > data.boundaries.right) {
          left = Math.min(popper.left, data.boundaries.right - popper.width);
        }
        return { left: left };
      },
      top: function() {
        var top = popper.top;
        if (popper.top < data.boundaries.top) {
          top = Math.max(popper.top, data.boundaries.top);
        }
        return { top: top };
      },
      bottom: function() {
        var top = popper.top;
        if (popper.bottom > data.boundaries.bottom) {
          top = Math.min(popper.top, data.boundaries.bottom - popper.height);
        }
        return { top: top };
      }
    };

    order.forEach((direction: string) => {
      data.offsets.popper = Object.assign(popper, check[direction]());
    });

    return data;
  }

  /**
   * Modifier used to make sure the popper is always near its reference
   * @method
   * @memberof Popper.modifiers
   * @argument {Object} data - The data object generated by _update method
   * @returns {Object} The data object, properly modified
   */
  public keepTogether(data: any) {
    var popper: any = getPopperClientRect(data.offsets.popper);
    var reference = data.offsets.reference;
    var f = Math.floor;

    if (popper.right < f(reference.left)) {
      data.offsets.popper.left = f(reference.left) - popper.width;
    }
    if (popper.left > f(reference.right)) {
      data.offsets.popper.left = f(reference.right);
    }
    if (popper.bottom < f(reference.top)) {
      data.offsets.popper.top = f(reference.top) - popper.height;
    }
    if (popper.top > f(reference.bottom)) {
      data.offsets.popper.top = f(reference.bottom);
    }

    return data;
  }

  /**
   * Modifier used to flip the placement of the popper when the latter is starting overlapping its reference element.
   * Requires the `preventOverflow` modifier before it in order to work.
   * **NOTE:** This modifier will run all its previous modifiers everytime it tries to flip the popper!
   * @method
   * @memberof Popper.modifiers
   * @argument {Object} data - The data object generated by _update method
   * @returns {Object} The data object, properly modified
   */
  public flip(data: any) {
    // check if preventOverflow is in the list of modifiers before the flip modifier.
    // otherwise flip would not work as expected.
    if (!this.isModifierRequired(this.flip, this.preventOverflow)) {
      console.warn(
        "WARNING: preventOverflow modifier is required by flip modifier in order to work, be sure to include it before flip!"
      );
      return data;
    }

    if (data.flipped && data.placement === data._originalPlacement) {
      // seems like flip is trying to loop, probably there's not enough space on any of the flippable sides
      return data;
    }

    var placement = data.placement.split("-")[0];
    var placementOpposite: any = getOppositePlacement(placement);
    var variation = data.placement.split("-")[1] || "";

    var flipOrder: any[] = [];
    if (this._options.flipBehavior === "flip") {
      flipOrder = [placement, placementOpposite];
    } else {
      flipOrder = this._options.flipBehavior;
    }

    flipOrder.forEach(
      ((step: any, index: number) => {
        if (placement !== step || flipOrder.length === index + 1) {
          return;
        }

        placement = data.placement.split("-")[0];
        placementOpposite = getOppositePlacement(placement);

        var popperOffsets: any = getPopperClientRect(data.offsets.popper);

        // this boolean is used to distinguish right and bottom from top and left
        // they need different computations to get flipped
        var a = ["right", "bottom"].indexOf(placement) !== -1;

        // using Math.floor because the reference offsets may contain decimals we are not going to consider here

        if (
          // @ts-ignore
          (a &&
            Math.floor(data.offsets.reference[placement]) >
              Math.floor(popperOffsets[placementOpposite])) ||
          // @ts-ignore
          (!a &&
            Math.floor(data.offsets.reference[placement]) <
              Math.floor(popperOffsets[placementOpposite]))
        ) {
          // we'll use this boolean to detect any flip loop
          data.flipped = true;
          data.placement = flipOrder[index + 1];
          if (variation) {
            data.placement += "-" + variation;
          }
          data.offsets.popper = this._getOffsets(
            this._popper,
            this._reference!,
            data.placement
          ).popper;

          data = this.runModifiers(data, this._options.modifiers );
        }
      })
    );
    return data;
  }

  /**
   * Modifier used to add an offset to the popper, useful if you more granularity positioning your popper.
   * The offsets will shift the popper on the side of its reference element.
   * @method
   * @memberof Popper.modifiers
   * @argument {Object} data - The data object generated by _update method
   * @returns {Object} The data object, properly modified
   */
  public offset(data: any) {
    var offset = this._options.offset;
    var popper = data.offsets.popper;

    if (data.placement.indexOf("left") !== -1) {
      popper.top -= offset;
    } else if (data.placement.indexOf("right") !== -1) {
      popper.top += offset;
    } else if (data.placement.indexOf("top") !== -1) {
      popper.left -= offset;
    } else if (data.placement.indexOf("bottom") !== -1) {
      popper.left += offset;
    }
    return data;
  }

  /**
   * Modifier used to move the arrows on the edge of the popper to make sure them are always between the popper and the reference element
   * It will use the CSS outer size of the arrow element to know how many pixels of conjuction are needed
   * @method
   * @memberof Popper.modifiers
   * @argument {Object} data - The data object generated by _update method
   * @returns {Object} The data object, properly modified
   */
  public arrow(data: any) {
    var arrow = this._options.arrowElement;
    var arrowOffset = this._options.arrowOffset;

    // if the arrowElement is a string, suppose it's a CSS selector
    if (typeof arrow === "string") {
      arrow = this._popper.querySelector(arrow);
    }

    // if arrow element is not found, don't run the modifier
    if (!arrow) {
      return data;
    }

    // the arrow element must be child of its popper
    if (!this._popper.contains(arrow)) {
      console.warn(
        "WARNING: `arrowElement` must be child of its popper element!"
      );
      return data;
    }

    // arrow depends on keepTogether in order to work
    if (!this.isModifierRequired(this.arrow, this.keepTogether)) {
      console.warn(
        "WARNING: keepTogether modifier is required by arrow modifier in order to work, be sure to include it before arrow!"
      );
      return data;
    }

    var arrowStyle: any = {};
    var placement = data.placement.split("-")[0];
    var popper: any = getPopperClientRect(data.offsets.popper);
    var reference = data.offsets.reference;
    var isVertical = ["left", "right"].indexOf(placement) !== -1;

    var len = isVertical ? "height" : "width";
    var side = isVertical ? "top" : "left";
    var translate = isVertical ? "translateY" : "translateX";
    var altSide = isVertical ? "left" : "top";
    var opSide = isVertical ? "bottom" : "right";
    // @ts-ignore
    var arrowSize = getOuterSizes(arrow)[len];

    //
    // extends keepTogether behavior making sure the popper and its reference have enough pixels in conjuction
    //

    // top/left side
    if (reference[opSide] - arrowSize < popper[side]) {
      data.offsets.popper[side] -=
        popper[side] - (reference[opSide] - arrowSize);
    }
    // bottom/right side
    if (reference[side] + arrowSize > popper[opSide]) {
      data.offsets.popper[side] += reference[side] + arrowSize - popper[opSide];
    }

    // compute center of the popper
    var center =
      reference[side] + (arrowOffset || reference[len] / 2 - arrowSize / 2);

    var sideValue = center - popper[side];

    // prevent arrow from being placed not contiguously to its popper
    sideValue = Math.max(Math.min(popper[len] - arrowSize - 8, sideValue), 8);
    arrowStyle[side] = sideValue;
    arrowStyle[altSide] = ""; // make sure to remove any old style from the arrow

    data.offsets.arrow = arrowStyle;
    data.arrowElement = arrow;

    return data;
  }

  /**
   * Helper used to know if the given modifier depends from another one.
   * @method
   * @memberof Popper
   * @param {String} requesting - name of requesting modifier
   * @param {String} requested - name of requested modifier
   * @returns {Boolean}
   */
  public isModifierRequired(requesting: any, requested: any) {
    var index = getArrayKeyIndex(this._options.modifiers, requesting);
    return !!this._options.modifiers.slice(0, index).filter((modifier: any) => {
      return modifier === requested;
    }).length;
  }
}
