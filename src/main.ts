import { createApp } from "vue"
import { createPinia } from "pinia"
import App from "./App.vue"

// 导入样式
import "./styles/variables.css"
import "./styles/global.css"

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount("#app")
