<template>
	<div></div>
</template>
<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { PopupManager } from "./popup-manager";
import { Popper } from "./popper";
const stop = (e: any) => e.stopPropagation();
@Component({
	name: "VuePopover"
})
export default class VuePopover extends Vue {
	// 是否关闭pop框当点击页面其他部分的时候
	@Prop({
		type: Boolean,
		default() {
			return true;
		}
	})
	public isCloseClickDocument!: boolean;

	// 是否可用
	@Prop({
		type: Boolean,
		default() {
			return false;
		}
	})
	public disabled!: boolean;

	// 是否有箭头
	@Prop({
		type: Boolean,
		default() {
			return true;
		}
	})
	public visibleArrow!: boolean;

	// 是否有箭头
	@Prop({
		type: Boolean,
		default() {
			return true;
		}
	})
	public appendToBody!: boolean;

	// 当前popper框dom对象
	@Prop({
		type: Object,
		default() {
			return null;
		}
	})
	public popper: any;

	// 当前popper框参数
	@Prop({
		type: Object,
		default() {
			return {
        gpuAcceleration: false
      }
		}
	})
	public popperOptions: any;

	// 当前popper框位置
	@Prop({
		type: String,
		default() {
			return "";
		}
	})
	public placement!: string;

	// 自己定义的reference
	@Prop({
		type: Object,
		default() {
			return null;
		}
	})
	public reference!: any;

	@Prop({
		type: [Boolean, String],
		default() {
			return false;
		}
	})
	public transformOrigin!: Boolean | string;

	@Watch("showPopper")
	public onShowPopperChanged(val: boolean): void {
		if (this.disabled) return;
		val ? this.updatePopper() : this.destroyPopper();
		this.$emit("input", val);
	}

	public showPopper: boolean = false;
	public popperJS: any = null;

	// 需要显示popover的元素
	public referenceElm?: any;
	public popperElm?: any;

	// 当前placement位置
	public currentPlacement: string = "";

	public updatePopper() {
		const popperJS = this.popperJS;
		if (popperJS) {
			popperJS.update();
			if (popperJS._popper) {
				popperJS._popper.style.zIndex = PopupManager.nextZIndex();
			}
		} else {
			this.createPopper();
		}
	}

	public createPopper() {
		this.currentPlacement = this.currentPlacement || this.placement;
		if (
			!/^(top|bottom|left|right)(-start|-end)?$/g.test(this.currentPlacement)
		) {
			return;
		}
		const options = this.popperOptions;
		const popper = (this.popperElm =
			this.popperElm || this.popper || this.$refs.popper);
		let reference = (this.referenceElm =
			this.referenceElm || this.reference || this.$refs.reference);

		if (!reference && this.$slots.reference && this.$slots.reference[0]) {
			reference = this.referenceElm = this.$slots.reference[0].elm;
		}

		if (!popper || !reference) return;

		if (this.visibleArrow) this.appendArrow(popper);
		if (this.appendToBody) document.body.appendChild(this.popperElm);

		if (this.popperJS && this.popperJS.destroy) {
			this.popperJS.destroy();
    }
    options.placement = this.currentPlacement;
    
		this.popperJS = new Popper(reference, popper, options);
		this.popperJS.onCreate(() => {
			this.$emit("created", this);
			this.resetTransformOrigin();
			this.$nextTick(this.updatePopper);
		});
		if (options && typeof options.onUpdate === "function") {
			this.popperJS.onUpdate(options.onUpdate);
		}
		this.popperJS._popper.style.zIndex = PopupManager.nextZIndex();
		this.popperElm.addEventListener("click", stop);
	}

	public appendArrow(element: any) {
		let hash: any;

		for (let item in element.attributes) {
			if (/^_v-/.test(element.attributes[item].name)) {
				hash = element.attributes[item].name;
				break;
			}
		}

		const arrow = document.createElement("div");

		if (hash) {
			arrow.setAttribute(hash, "");
		}
		arrow.setAttribute("x-arrow", "");
		arrow.className = "popper__arrow";
		element.appendChild(arrow);
	}

	public destroyPopper() {
		if (this.popperJS) {
			this.resetTransformOrigin();
		}
	}

	public resetTransformOrigin() {
		if (!this.transformOrigin) return;
		let placementMap: any = {
			top: "bottom",
			bottom: "top",
			left: "right",
			right: "left"
		};
		let placement = this.popperJS._popper
			.getAttribute("x-placement")
			.split("-")[0];
		let origin: any = placementMap[placement];
		this.popperJS._popper.style.transformOrigin =
			typeof this.transformOrigin === "string"
				? this.transformOrigin
				: ["top", "bottom"].indexOf(placement) > -1
					? `center ${origin}`
					: `${origin} center`;
	}

	public beforeDestroy() {
		this.doDestroy(true);
		if (this.popperElm && this.popperElm.parentNode === document.body) {
			this.popperElm.removeEventListener("click", stop);
			document.body.removeChild(this.popperElm);
		}
	}

	// call destroy in keep-alive mode
	public deactivated() {
		//@ts-ignore
		this.$options.beforeDestroy[0].call(this);
	}

	public doDestroy(forceDestroy: boolean) {
		/* istanbul ignore if */
		if (!this.popperJS || (this.showPopper && !forceDestroy)) return;
		this.popperJS.destroy();
		this.popperJS = null;
	}
}
</script>
<style lang="scss">
$--popover-arrow-size: 6px !default;
$--tooltip-arrow-size: 6px !default;

$--border-color-lighter: #EBEEF5 !default;
$--color-white: #FFFFFF !default;

$--popover-border-color: $--border-color-lighter !default;
$--popover-background-color: $--color-white !default;

.popper__arrow,
.popper__arrow::after {
	position: absolute;
	display: block;
	width: 0;
	height: 0;
	border-color: transparent;
	border-style: solid;
}

.popper__arrow {
	border-width: $--popover-arrow-size;
	filter: drop-shadow(0 2px 12px rgba(0, 0, 0, 0.03));
}

.popper__arrow::after {
	content: " ";
	border-width: $--popover-arrow-size;
}

.popper {
	&[x-placement^="bottom"] {
		margin-top: #{$--popover-arrow-size + 6};
	}

	&[x-placement^="bottom"] .popper__arrow {
		top: -$--popover-arrow-size;
		left: 50%;
		margin-right: #{$--tooltip-arrow-size / 2};
		border-top-width: 0;
		border-bottom-color: $--popover-border-color;

		&::after {
			top: 1px;
			margin-left: -$--popover-arrow-size;
			border-top-width: 0;
			border-bottom-color: $--popover-background-color;
		}
	}
}
</style>
