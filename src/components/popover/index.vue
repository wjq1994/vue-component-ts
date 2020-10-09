<template>
  <span>
    <transition>
      <div
        class="popper popup"
        ref="popper"
        v-show="!disabled && showPopper"
        :id="tooltipId"
      >
        <div class="el-popover__title" v-if="title" v-text="title"></div>
        <slot>{{ content }}</slot>
      </div>
    </transition>
    <!--需要显示popover的元素-->
    <slot name="reference"></slot>
  </span>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";

// 引入工具类
// @ts-ignore
import { generateId } from '../utils/util';
import { on, off, addClass, removeClass, isContains } from './utils/dom';

// 引入组件
import vuePopover from './vue-popover.vue';

@Component({
  name: "Popover"
})
export default class Popover extends vuePopover {
    @Prop({
        type: String,
        default() {
            return ""
        }
    }) public title!: string;

    @Prop({
        type: String,
        default() {
            return ""
        }
    }) public width!: string;

    @Prop({
        type: String,
        default() {
            return ""
        }
    }) public content!: string;

    @Prop({
        type: String,
        default() {
            return ""
        }
    }) public trigger!: string;

    @Prop({
        type: Number,
        default() {
            return 0
        }
    }) public tabindex!: string;

    get tooltipId() {
        return `popover-${generateId()}`;
    }

    public handleFocus() {
        this.showPopper = true;
    }

    public handleBlur() {
        this.showPopper = false;
    }

    public handleMouseEnter() {
        this.showPopper = true;
    }

    public handleMouseLeave() {
        this.showPopper = false;
    }

    public doToggle() {
        this.showPopper = !this.showPopper;
    }

    public doShow() {
        this.showPopper = true;
    }

    public doClose() {
        this.showPopper = false;
    }

    public handleDocumentClick(e: any) {

        if (!this.isCloseClickDocument) {
            return;
        }

        let reference = this.reference || this.$refs.reference;
        const popper = this.popper || this.$refs.popper;

        if (!reference && this.$slots.reference && this.$slots.reference[0]) {
            reference = this.referenceElm = this.$slots.reference[0].elm;
        }
        if (!this.$el ||
            !reference ||
            isContains(this.$el, e.target) ||
            isContains(reference, e.target) ||
            !popper ||
            isContains(popper, e.target)) return;
        this.showPopper = false;
    }

    mounted() {
        let reference = this.referenceElm = this.reference || this.$refs.reference;
        const popper = this.popper || this.$refs.popper;

        if (!reference && this.$slots.reference && this.$slots.reference[0]) {
            reference = this.referenceElm = this.$slots.reference[0].elm;
        }

        if (reference) {
            reference.setAttribute('tabindex', this.tabindex); // tab序列
            popper.setAttribute('tabindex', 0);
        }

        if (this.trigger === 'hover') {
            on(reference, 'mouseenter', this.handleMouseEnter);
            on(popper, 'mouseenter', this.handleMouseEnter);
            on(reference, 'mouseleave', this.handleMouseLeave);
            on(popper, 'mouseleave', this.handleMouseLeave);
        } else if (this.trigger === 'click') {
            on(reference, 'click', this.doToggle);
            on(document, 'click', this.handleDocumentClick);
        }

    }

    beforeDestroy() {
    }

    deactivated() {
    }

    destroyed() {
        let reference = this.referenceElm;

        off(reference, 'mouseenter', this.handleMouseEnter);
        off(reference, 'mouseleave', this.handleMouseLeave);
        off(reference, 'click', this.doToggle);
        off(document, 'click', this.handleDocumentClick);
    }

}
</script>

<style lang="scss">
  .popper {
    position: absolute;
    background: #FFFFFF;
    min-width: 150px;
    border-radius: 4px;
    border: 1px solid #EBEEF5;
    padding: 12px;
    z-index: 2000;
    color: #606266;
    line-height: 1.4;
    text-align: justify;
    font-size: 14px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    word-break: break-all;
    outline: none;
  }
</style>
