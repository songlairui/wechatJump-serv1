# electron-serv

> 使用electron显示android屏幕内容
> An electron-vue project

### why? 
electron can use the native socket directly without middle-socket-server

### main page
display a full-width fitted canvas element.  
[CSS object-fit](https://stackoverflow.com/questions/20590239/maintain-aspect-ratio-of-div-but-fill-screen-width-and-height-in-css?answertab=active#tab-top)

### usage 

- startAll ， 实际上是startMiniCap and getliveStream，获得实时图像
- startMiniTouch ， 启动触控行为
- startkoa , 点击之后，打开 localhost:3456 。页面中有capture按钮。

### before

install minitouch minicap firstly

### TODO  
[ ] build a socket server
  [ ] - capture current screen
  [ ] - click @ x,y | orientation
  [ ] - KOA
    [ ] - KOA-RESTFUL

### TO IMPROVE

[ ] custom fps
[ ] change orientation without image-cap-serv reload


### Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:9080
npm run dev

# build electron application for production
npm run build

# run end-to-end tests
npm test


# lint all JS/Vue component files in `src/`
npm run lint

```

---

This project was generated with [electron-vue](https://github.com/SimulatedGREG/electron-vue) using [vue-cli](https://github.com/vuejs/vue-cli). Documentation about the original structure can be found [here](https://simulatedgreg.gitbooks.io/electron-vue/content/index.html).
