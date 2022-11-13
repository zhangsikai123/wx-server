var db = require('./db');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var session = require('express-session');
var axios = require('axios');
var config = require('./config');
var WXBizDataCrypt = require('./WXBizDataCrypt');
var app = express();
const prefix = '/wx/douke';
const port = 8081;

// 存储所有用户信息
const users = {
  // openId 作为索引
  openId: {
    // 数据结构如下
    openId: '', // 理论上不应该返回给前端
    sessionKey: '',
    nickName: '',
    avatarUrl: '',
    unionId: '',
    phoneNumber: ''
  }
};

app
  .use(bodyParser.json())
  .use(session({
    secret: 'alittlegirl',
    resave: false,
    saveUninitialized: true
  }))

  .use((req, res, next) => {
    req.user = users[req.session.openId];
    console.log(`req.url: ${req.url}`);
    if (req.user) {
      console.log(`wxapp openId`, req.user.openId);
    } else {
      console.log(`session`, req.session.id);
    }
    next();
  })

  .post(prefix + '/oauth/login', (req, res) => {
    var params = req.body;
    var {code, type} = params;
    if (type === 'wxapp') {
      axios.get('https://api.weixin.qq.com/sns/jscode2session', {
        params: {
          appid: config.appId,
          secret: config.appSecret,
          js_code: code,
          grant_type: 'authorization_code'
        }
      }).then(({data}) => {
        console.log(data);
        var openId = data.openid;
        var user = users[openId];
        if (!user) {
          user = {
            openId,
            sessionKey: data.session_key
          };
          users[openId] = user;
          console.log('新用户', user);
        } else {
          console.log('老用户', user);
        }
        req.session.openId = user.openId;
      }).then(() => {
        res.send({
          code: 0
        });
      });
    } else {
      throw new Error('未知的授权类型');
    }
  })

  .get(prefix + '/user/info', (req, res) => {
    if (req.user) {
      return res.send({
        code: 0,
        data: req.user
      });
    }
    throw new Error('获取用户openId失败');
  })

  .post(prefix + '/user/bindinfo', (req, res) => {
    var user = req.user;
    if (user) {
      var {encryptedData, iv} = req.body;
      var pc = new WXBizDataCrypt(config.appId, user.sessionKey);
      try {
        var data = pc.decryptData(encryptedData, iv);
      } catch (err) {
        throw new Error('session 失效建议重新登录');
      }
      Object.assign(user, data);
      return res.send({
        code: 0
      });
    }
    throw new Error('获取用户openId失败');
  })

  .post(prefix + '/user/bindphone', (req, res) => {
    var user = req.user;
    if (user) {
      var {encryptedData, iv} = req.body;
      var pc = new WXBizDataCrypt(config.appId, user.sessionKey);
      try {
        var data = pc.decryptData(encryptedData, iv);
      } catch (err) {
        throw new Error('session 失效建议重新登录');
      }
      Object.assign(user, data);
      return res.send({
        code: 0
      });
    }
    throw new Error('获取用户openId失败');
  })

  .post(prefix + '/form', (req, res) => {
    var user = req.user;
    var body = req.body;
    if (user) {
      if (!user.phoneNumber){
        return res.send({code:-1, message: '用户未登录'});
      }
      var form = {'phone': user.phoneNumber, 'user': user.openId};
      for (let i in body) {
        var data = body[i];
        var type = data.original.type;
        if (type == 'file'){
          form[i] = data.list;
        } else if (type == 'date') {
          form[i] = { 'end': data.endDate, 'start': data.startDate };
        } else {
          form[i] = data.value;
        }
      };
      db.save(form);
    } else {
      throw new Error('获取用户openId失败');
    }
    return res.send({
        code: 0
      });
  })
  .get(prefix + '/forms', (req, res) => {
    let phone = req.query.phone;
    let forms = [];
    if (phone){
      forms = db.findByPhone(phone);
    } else {
      forms = db.findAll();
    }
    return res.send({data: forms, code: 0});
  })
  .get(prefix + '/form', (req, res) => {
    let form = db.findByID(req.query.id);
    return res.send({data: form, code: 0});
  })
  .use(function (err, req, res, next) {
    console.log('err', err.message);
    res.send({
      code: 500,
      message: err.message
    });
  })
  .listen(port, err => {
    console.log(`listen on http://localhost:${port}`);
  });
