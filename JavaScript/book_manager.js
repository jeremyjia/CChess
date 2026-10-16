// book_manager.js - 完整修复版
"use strict";

var BookManager = {
  config: {
    owner: 'jeremyjia',
    repo: 'Games',
    issueNumber: 1244,
    token: "ghp_Od6GW3"+"J2NiP01Zsz"+"g9JQV0amzn"+"UxhF33iBES"
  },

  getBookData: function() {
    if (typeof BOOK_DAT !== 'undefined' && BOOK_DAT.length > 0) {
      return BOOK_DAT;
    }
    return [];
  },

  addEntry: function(lock, mv, weight) {
    if (!lock || !mv) return false;
    var data = this.getBookData();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === lock && data[i][1] === mv) {
        data[i][2] = Math.max(data[i][2], weight || 5);
        return true;
      }
    }
    data.push([lock, mv, weight || 5]);
    data.sort(function(a, b) { return a[0] - b[0]; });
    return true;
  },

  addEntries: function(entries) {
    var count = 0;
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var lock = Array.isArray(entry) ? entry[0] : entry.lock;
      var mv = Array.isArray(entry) ? entry[1] : entry.mv;
      var weight = Array.isArray(entry) ? (entry[2] || 5) : (entry.weight || 5);
      if (this.addEntry(lock, mv, weight)) {
        count++;
      }
    }
    return count;
  },

  exportAsBookJS: function() {
    var data = this.getBookData();
    var clean = [];
    for (var i = 0; i < data.length; i++) {
      if (data[i] !== null) clean.push(data[i]);
    }
    return 'var BOOK_DAT = ' + JSON.stringify(clean, null, 2) + ';\n\nBOOK_DAT.pop();';
  },

  loadFromGitHub: function() {
    var self = this;
    return new Promise(function(resolve) {
      if (!self.config.token) {
        resolve({ success: false, message: '未配置GitHub Token' });
        return;
      }

      var url = 'https://api.github.com/repos/' + self.config.owner + '/' + self.config.repo + '/issues/' + self.config.issueNumber + '/comments';
      
      fetch(url, {
        headers: { 'Authorization': 'token ' + self.config.token }
      }).then(function(response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        return response.json();
      }).then(function(comments) {
        var count = 0;
        for (var i = 0; i < comments.length; i++) {
          var entries = self.parseComment(comments[i].body);
          for (var j = 0; j < entries.length; j++) {
            if (self.addEntry(entries[j].lock, entries[j].mv, entries[j].weight)) {
              count++;
            }
          }
        }
        resolve({ success: true, message: '从GitHub同步了 ' + count + ' 条记录', count: count });
      }).catch(function(err) {
        resolve({ success: false, message: '同步失败: ' + err.message });
      });
    });
  },

  // ★★★ 修复：支持数组和对象两种格式 ★★★
  saveToGitHub: function(entries) {
    var self = this;
    return new Promise(function(resolve) {
      if (!self.config.token) {
        resolve({ success: false, message: '未配置GitHub Token' });
        return;
      }

      // 统一转换为对象格式
      var formattedEntries = [];
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (Array.isArray(entry)) {
          formattedEntries.push({
            lock: entry[0],
            mv: entry[1],
            weight: entry[2] || 5
          });
        } else {
          formattedEntries.push(entry);
        }
      }

      var comment = self.buildComment(formattedEntries);
      var url = 'https://api.github.com/repos/' + self.config.owner + '/' + self.config.repo + '/issues/' + self.config.issueNumber + '/comments';

      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'token ' + self.config.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body: comment })
      }).then(function(response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        return response.json();
      }).then(function() {
        resolve({ success: true, message: '成功提交 ' + formattedEntries.length + ' 条记录到GitHub' });
      }).catch(function(err) {
        resolve({ success: false, message: '提交失败: ' + err.message });
      });
    });
  },

  parseComment: function(body) {
    var lines = body.split('\n');
    var entries = [];
    for (var i = 0; i < lines.length; i++) {
      var match = lines[i].match(/lock=(\d+),\s*mv=(\d+),\s*weight=(\d+)/);
      if (match) {
        entries.push({
          lock: parseInt(match[1]),
          mv: parseInt(match[2]),
          weight: parseInt(match[3])
        });
      }
    }
    return entries;
  },

  buildComment: function(entries) {
    var comment = '## 自动学习记录\n\n';
    comment += '**学习时间**: ' + new Date().toLocaleString() + '\n\n';
    comment += '### 数据\n\n```text\n';
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      comment += 'lock=' + entry.lock + ', mv=' + entry.mv + ', weight=' + entry.weight + '\n';
    }
    comment += '```\n';
    return comment;
  }
};

window.BookManager = BookManager;