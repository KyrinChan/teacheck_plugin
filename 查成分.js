/*
成分姬插件 - YunzaiBot特供版
核心代码思路来自：NoneBot2 成分姬插件 - https://github.com/noneplugin/nonebot-plugin-ddcheck
改编者：Yujio_Nako
若有bug可以在GitHub提请issue：
https://github.com/ldcivan/ddcheck_plugin
*/

import plugin from '../../lib/plugins/plugin.js'
import { segment } from "oicq";
import fetch from "node-fetch"
import schedule from 'node-schedule'
import fs from 'fs'
import cfg from '../../lib/config/config.js'

//在这里填写你的b站cookie↓↓↓↓↓
var cookie = ""
//在这里填写你的b站cookie↑↑↑↑↑
//在这里填写你的自动刷新列表设置↓↓↓↓↓
let rule =`30 10 15 * * ?`  //更新的秒，分，时，日，月，星期几；日月/星期几为互斥条件，必须有一组为*
let auto_refresh = 1  //是否自动更新列表，1开0关
let masterId = cfg.masterQQ[0]  //管理者QQ账号

let refresh = schedule.scheduleJob(rule, async (e) => {
    if(auto_refresh==1){
        var local_json = JSON.parse(fs.readFileSync(dirpath + "/" + filename, "utf8"));//读取文件
        for(var i = 0;i<3;i++){
            var response = await fetch(urls[i], { "method": "GET" });
            if(response.status==200){
                await Bot.pickUser(masterId).sendMsg(`使用api：${urls[i]}`)
                break
            }
        }
        let v_list = await response.json()
        for(var j = 0;j<Object.keys(v_list).length;j++){
            var data = {
                "uname": v_list[j].uname,
                "roomid":v_list[j].roomid
            }
            var record_num = 0
            var refresh_num = 0
            var record = []
            var refresh = []
            if(!local_json.hasOwnProperty(v_list[j].mid)) {//如果json中不存在该用户
                local_json[v_list[j].mid] = data
                console.log(`${v_list[j].mid}已记录`)
                record.push(`${v_list[j].mid}已记录`)
                record_num++
            }else{
            if(local_json.hasOwnProperty(v_list[j].mid)&&local_json[v_list[j].mid] != data) //存在但有变化
            {
                local_json[v_list[j].mid] = data
                console.log(`${v_list[j].mid}已刷新`)
                refresh.push(`${v_list[j].mid}已刷新`)
                refresh_num++
            }}
        }
        await fs.writeFileSync(dirpath + "/" + filename, JSON.stringify(local_json, null, "\t"));//写入文件
        await Bot.pickUser(masterId).sendMsg(`虚拟主播列表更新完毕，共${Object.keys(v_list).length}条消息！`)
        if(record_num!=0) {await Bot.pickUser(masterId).sendMsg(`新增了${record_num}条`)
            if(record_num<=10) {await Bot.pickUser(masterId).sendMsg(`${record}`)}
        }
        if(refresh_num!=0) {await Bot.pickUser(masterId).sendMsg(`更新了${refresh_num}条`)
            if(refresh_num<=10) {await Bot.pickUser(masterId).sendMsg(`${refresh}`)}
        }
        await Bot.pickUser(masterId).sendMsg(`成分姬-列表自动更新完成`)
    }
})

const urls = [
    "https://api.vtbs.moe/v1/short",
    "https://api.tokyo.vtbs.moe/v1/short",
    "https://vtbs.musedash.moe/v1/short",
]
const attention_url = "https://account.bilibili.com/api/member/getCardByMid?mid="
const medal_url = "https://api.live.bilibili.com/xlive/web-ucenter/user/MedalWall?target_id="
const dirpath = "plugins/example/cha_chengfen"
var filename = `vtuber_list.json`
if (!fs.existsSync(dirpath)) {//如果文件夹不存在
	fs.mkdirSync(dirpath);//创建文件夹
}
if (!fs.existsSync(dirpath + "/" + filename)) {
    fs.writeFileSync(dirpath + "/" + filename, JSON.stringify({
    }))
}

export class example extends plugin {
    constructor() {
        super({
            name: 'pic_search',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?查?成分.*$',
                    fnc: 'cha_chengfen'
                },
                {
                  reg: "^#?更新(V|v)列表$",
                  fnc: 'get_v_list'
                },
                {
                  reg: "^#?查?成分帮助$",
                  fnc: 'chengfen_help'
                }
            ]
        })
    }


    async cha_chengfen(e) {
        let message = []
        let mid = e.msg.replace(/#| |查?成分/g, "")
        if(mid == "") {
            this.chengfen_help(e)
            return
        }
        const vtb_list = JSON.parse(fs.readFileSync(dirpath + "/" + filename, "utf8"));//读取文件
        const attention_list = await this.get_attention_list(mid)
        if(attention_list.card.attention!=0 && JSON.stringify(attention_list.card.attentions)=="[]"){
            this.reply(`对方可能隐藏了关注列表`)
            return
        }
        const medal_list = await this.get_medal_list(mid)
        await message.push(`用户${JSON.stringify(attention_list.card.name)}，共${Object.keys(attention_list.card.attentions).length}个关注！\n`)
        
        var v_num = 0
        for(var i = 0;i<Object.keys(attention_list.card.attentions).length;i++){
            if(vtb_list.hasOwnProperty(attention_list.card.attentions[i])) {//如果json中存在该用户
                let uid = attention_list.card.attentions[i]
                message.push(`${JSON.stringify(vtb_list[uid].uname).replaceAll("\"","")} - ${uid}\n`)
                if(medal_list.hasOwnProperty(attention_list.card.attentions[i])){
                    message.push(`└${JSON.stringify(medal_list[uid].medal_name).replaceAll("\"","")}|${medal_list[uid].level}\n`)
                }
                v_num++
            }
        }
        message.push(`${(v_num/(i)*100).toFixed(2)}% (${v_num}/${i})\n`)
        
        let forwardMsg = await this.makeForwardMsg(`查成分结果：`, message)
        await this.reply(forwardMsg)
        return
    }
    
    async get_v_list(e) {
        var local_json = JSON.parse(fs.readFileSync(dirpath + "/" + filename, "utf8"));//读取文件
        for(var i = 0;i<3;i++){
            var response = await fetch(urls[i], { "method": "GET" });
            if(response.status==200){
                await this.reply(`使用api：${urls[i]}`)
                break
            }
        }
        let v_list = await response.json()
        for(var j = 0;j<Object.keys(v_list).length;j++){
            var data = {
                "uname": v_list[j].uname,
                "roomid":v_list[j].roomid
            }
            var record_num = 0
            var refresh_num = 0
            var record = []
            var refresh = []
            if(!local_json.hasOwnProperty(v_list[j].mid)) {//如果json中不存在该用户
                local_json[v_list[j].mid] = data
                console.log(`${v_list[j].mid}已记录`)
                record.push(`${v_list[j].mid}已记录`)
                record_num++
            }else{
            if(local_json.hasOwnProperty(v_list[j].mid)&&local_json[v_list[j].mid] != data) //存在但有变化
            {
                local_json[v_list[j].mid] = data
                console.log(`${v_list[j].mid}已刷新`)
                refresh.push(`${v_list[j].mid}已刷新`)
                refresh_num++
            }}
        }
        await fs.writeFileSync(dirpath + "/" + filename, JSON.stringify(local_json, null, "\t"));//写入文件
        await this.reply(`虚拟主播列表更新完毕，共${Object.keys(v_list).length}条消息！`)
        if(record_num!=0) {await this.reply(`新增了${record_num}条`)
            if(record_num<=10) {await this.reply(`${record}`)}
        }
        if(refresh_num!=0) {await this.reply(`更新了${refresh_num}条`)
            if(refresh_num<=10) {await this.reply(`${refresh}`)}
        }
    }
    
    async get_attention_list(mid) {
        var response = await fetch(attention_url+mid, { "method": "GET" });
        if (response.status==404) {
            await this.reply("404，可能是uid不存在")
            return false
        }
        var attention_list = await response.json()
        return attention_list
    }
    
    async get_medal_list(mid) {
        var response = await fetch(medal_url+mid, { "headers": {"cookie": cookie},"method": "GET" });
        if (response.status==404) {
            await this.reply("404，可能是uid不存在")
            return false
        }
        var medal_list_raw = await response.json()
        if(medal_list_raw.code!=0){
            await this.reply(JSON.stringify(medal_list_raw.message))
            return
        }
        var medal_list = {}
        for(var i = 0;i<Object.keys(medal_list_raw.data.list).length;i++){
            var data = {
                "level":medal_list_raw.data.list[i].medal_info.level,
                "medal_name":medal_list_raw.data.list[i].medal_info.medal_name
            }
            medal_list[medal_list_raw.data.list[i].medal_info.target_id] = data
        }
        return medal_list
    }
    
    async makeForwardMsg (title, msg) {
    let nickname = Bot.nickname
    if (this.e.isGroup) {
      let info = await Bot.getGroupMemberInfo(this.e.group_id, Bot.uin)
      nickname = info.card ?? info.nickname
    }
    let userInfo = {
      user_id: Bot.uin,
      nickname
    }

    let forwardMsg = [
      {
        ...userInfo,
        message: title
      },
      {
        ...userInfo,
        message: msg
      }
    ]

    /** 制作转发内容 */
    if (this.e.isGroup) {
      forwardMsg = await this.e.group.makeForwardMsg(forwardMsg)
    } else {
      forwardMsg = await this.e.friend.makeForwardMsg(forwardMsg)
    }

    /** 处理描述 */
    forwardMsg.data = forwardMsg.data
      .replace(/\n/g, '')
      .replace(/<title color="#777777" size="26">(.+?)<\/title>/g, '___')
      .replace(/___+/, `<title color="#777777" size="26">${title}</title>`)

    return forwardMsg
  }
  async chengfen_help(e){
      await this.reply("查成分帮助\n1.发送 #更新v列表 更新主播列表到本地，建议每周至少更新一次\n2.使用 #查成分 目标uid 获取目标的成分，包括关注的V/游戏官号以及对应的粉丝牌")
  }
}
