// position 定位

.container {
    position: absolute / relative / fixed / sticky / static;
}

// static 默认定位
// 元素按照正常流布局， 不受定位影响
// left / top / right / bottom 不生效
// 写和不写没有区别

// relative
// 相对定位
// 元素按照正常流布局， 但是会保留自己的位置
// left / top / right / bottom 有效
// 参考自己的位置进行定位

// absolute 绝对定位
//  脱离正常流布局， 不受定位影响
// left / top / right / bottom 有效
// 参考最近的有定位的父元素进行定位 ， 如果没有， 则参考 body
// 如果 body 也没有定位， 则参考视口

// 搭配
.container {
    position: relative;
    .item {
        position: absolute;
    }
}

// fixed 
// 脱离正常流布局， 不受定位影响
// left / top / right / bottom 有效
// 参考视口进行定位

// sticky 粘性定位
// 它的参考是最近带有滚动属性的父元素
// 如果没有， 则参考视口
