# React19 状态管理方案与原理剖析

## 基础状态管理方案

状态方案选型依据

1. 如果是基础简单场景，考虑选用 useState
2. 状态相对复杂，但是不需要全局存储的话，useReducer
3. 如果状态跨层级消费，那么就需要使用，useContext
4. 状态在跨组件间使用，并且相对复杂，我们就考虑使用集中状态管理方案（redux、zustand、jotai）

### useState

```js
const [count] = useState(0);
const [name] = useState(0);
const [hobby] = useState([]);

const [person, setPerson] = useState({
  count: 0,
  name: "heyi",
  hobby: [],
});
```

## useReducer

分层结构

1. 初始化状态树
2. 状态如何改变，switch case
3. 更新实现，dispatch

redux 作者加入了 react 之后开发，思路。单向数据流，state、action、view

```js
const initialState = {
    count: 0,
    name: 'heyi'
}

const reducer = (state,action) => {
    switch(action.type) {
        case: 'updateCount': {
            return {...state, count: action.payload.count}
        }
    }
}


const [state, dispatch] = useReducer(reducer, initialState)
dispatch({type: 'updateCount', payload: {count: 100}})
```

## useContex

假设有一下四层组件，A 给 D 传一个属性国际化 lang=cn

A
    B
        C
            D

A 提供状态，作为提供者，Provider
D 消费状态，作为消费者，Consumer

```js
const LangContext = createContext("cn")

<LantContext.Provider value="cn">
    {/* .... */}
</LantContext.Provider>

<LantContext.Consumer>
    {ctx => {
        ctx.value
    }}
</LantContext.Consumer>
const ctx = useContext(LangContext)
```

vue provide、inject


## 集中状态管理方案

flux   ->  redux  ->  redux toolkit(rtk)

zustand 重点
jotai 细化一些状态优化场景，（原子状态）[affine]https://github.com/search?q=repo%3Atoeverything%2FAFFiNE%20jotai&type=code 文档项目
