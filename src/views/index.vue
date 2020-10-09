<template>
<div id="box">
    <popover
            placement="top-start"
            title="标题"
            width="200"
            trigger="click"
            :isCloseClickDocument="false"
            content="这是一段内容,这是一段内容,这是一段内容,这是一段内容。">
        <el-button>lalalala</el-button>
        <el-button slot="reference">hover 激活</el-button>
    </popover>
</div>
</template>

<script lang="ts">
import {Vue} from 'vue-property-decorator';
// @ts-ignore
import Popover from "../components/popover/index.vue";
// import Popover from "../components/el-popover/src/index.vue";

import {
    Component
} from "vue-property-decorator";

@Component({
    name: "index",
    components: {
        Popover
    }
})
export default class Index extends Vue {


}
</script>

<style lang="scss">
    html {
        height: 20px;
        overflow: scroll;
    }

    #box {
        margin-top: 100px;
    }
</style>
