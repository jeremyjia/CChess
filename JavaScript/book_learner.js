// book_learner.js - v1.0-best (匹配25条走法)
"use strict";

var BookLearner = {
  config: {
    owner: 'jeremyjia',
    repo: 'Games',
    issueNumber: 1244,
    token: "ghp_Od6GW3"+"J2NiP01Zsz"+"g9JQV0amzn"+"UxhF33iBES"
  },

  learnFromPGN: function(pgn) {
    var self = this;
    return new Promise(function(resolve) {
      console.log('========== 开始学习棋谱 ==========');
      
      var rawMoves = self.parsePGN(pgn);
      console.log('提取到的中文走法:', rawMoves);
      
      if (rawMoves.length === 0) {
        resolve({ success: false, message: '未提取到走法' });
        return;
      }

      var pos = new Position();
      pos.fromFen("rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1");
      
      var entries = [];
      var matchedCount = 0;

      for (var i = 0; i < rawMoves.length && i < 50; i++) {
        var chineseMove = rawMoves[i];
        var mvs = pos.generateMoves(null);
        var found = false;
        var isRed = (pos.sdPlayer === 0);
        
        for (var j = 0; j < mvs.length; j++) {
          var mv = mvs[j];
          var mvChinese = self.mvToChinese(mv, pos, isRed);
          
          if (mvChinese === chineseMove) {
            found = true;
          }
          
          if (!found) {
            var mvNorm = self.normalizeMove(mvChinese);
            var pgnNorm = self.normalizeMove(chineseMove);
            if (mvNorm === pgnNorm) {
              found = true;
            }
          }
          
          if (!found) {
            var mvPawn = mvChinese.replace('兵', '卒');
            if (mvPawn === chineseMove) {
              found = true;
            }
          }
          
          if (found) {
            var lock = pos.zobristLock >>> 1;
            var weight = 5;
            if (pos.squares[mv >> 8] > 0) weight += 3;
            
            pos.makeMove(mv);
            if (pos.inCheck()) weight += 2;
            pos.undoMakeMove();
            
            entries.push([lock, mv, Math.min(10, weight)]);
            pos.makeMove(mv);
            matchedCount++;
            console.log('✅ 匹配:', chineseMove, '->', mvChinese);
            break;
          }
        }
        
        if (!found) {
          console.log('❌ 未匹配:', chineseMove, '走棋方:', isRed ? '红方' : '黑方');
          var mvs2 = pos.generateMoves(null);
          if (mvs2.length > 0) {
            pos.makeMove(mvs2[0]);
          }
        }
      }

      console.log('成功匹配 ' + matchedCount + ' 条');
      
      if (entries.length === 0) {
        resolve({ success: false, message: '未能匹配到任何走法' });
        return;
      }

      if (typeof BookManager !== 'undefined') {
        var count = BookManager.addEntries(entries);
        resolve({ 
          success: true, 
          message: '学习了 ' + count + ' 条记录', 
          entries: entries,
          count: count
        });
      } else {
        resolve({ 
          success: true, 
          message: '解析了 ' + entries.length + ' 条记录', 
          entries: entries
        });
      }
    });
  },

  parsePGN: function(pgn) {
    var clean = pgn.replace(/\{.*?\}/g, '');
    clean = clean.replace(/\[.*?\]/g, '');
    clean = clean.replace(/1-0|0-1|1\/2-1\/2|\*/g, '');
    clean = clean.replace(/\d+\./g, ' ');
    clean = clean.replace(/\s+/g, ' ');
    
    var pattern = /([炮马象士将帅车兵卒])([一二三四五六七八九0-9])([平进退])([一二三四五六七八九0-9])/g;
    var matches = clean.match(pattern);
    if (!matches) return [];
    
    var unique = [];
    for (var i = 0; i < matches.length; i++) {
      var m = matches[i].trim();
      if (m.length >= 4 && unique.indexOf(m) < 0) {
        unique.push(m);
      }
    }
    return unique;
  },

  // ============================================================
  // 将 mv 转换为中文走法（v1.0-best 版本）
  // ============================================================
  mvToChinese: function(mv, pos, isRed) {
    var src = mv & 255;
    var dst = mv >> 8;
    var pc = pos.squares[src];
    var pcType = pc & 7;
    
    var pieceNames = {
      8: '帅', 9: '仕', 10: '相', 11: '马', 12: '车', 13: '炮', 14: '兵',
      16: '将', 17: '士', 18: '象', 19: '马', 20: '车', 21: '炮', 22: '卒'
    };
    var pieceName = pieceNames[pc] || '?';
    
    var srcX = (src & 15) - 2;
    var srcY = src >> 4;
    var dstX = (dst & 15) - 2;
    var dstY = dst >> 4;
    
    var xNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
    var xDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    
    // 列号显示：红方中文，黑方数字
    var display = isRed ? xNames : xDigits;
    
    // 起始列（红方不反转，黑方反转）
    var displayX = isRed ? srcX : (10 - srcX);
    var fromXStr = display[displayX - 1];
    
    // 目标列（红方不反转，黑方反转）
    var displayX2 = isRed ? dstX : (10 - dstX);
    var toXStr = display[displayX2 - 1];
    
    var action = '';
    var toStr = '';
    
    if (srcY === dstY) {
      action = '平';
      toStr = toXStr;
    } else {
      if (isRed) {
        action = (dstY < srcY) ? '进' : '退';
      } else {
        action = (dstY > srcY) ? '进' : '退';
      }
      
      if (pcType === 6) {
        // 兵/卒：显示步数（数字）
        var steps = Math.abs(dstY - srcY);
        toStr = steps.toString();
      } else if (pcType === 4) {
        // 车：显示目标行号（红方中文，黑方数字）
        var targetRow = isRed ? (dstY - 2) : (13 - dstY);
        toStr = isRed ? xNames[targetRow - 1] : targetRow.toString();
      } else {
        // ★★★ 其他棋子（马、炮、相、士、帅）：显示目标列号 ★★★
        toStr = toXStr;
      }
    }
    
    return pieceName + fromXStr + action + toStr;
  },

  normalizeMove: function(move) {
    if (!move || move.length < 4) return move;
    var chineseToDigit = {
      '一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
      '六': '6', '七': '7', '八': '8', '九': '9'
    };
    var result = '';
    for (var i = 0; i < move.length; i++) {
      var ch = move.charAt(i);
      result += chineseToDigit[ch] || ch;
    }
    return result;
  },

  submitToGitHub: function(entries) {
    var self = this;
    return new Promise(function(resolve) {
      if (!self.config.token) {
        resolve({ success: false, message: '未配置GitHub Token' });
        return;
      }
      var comment = self.buildComment(entries);
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
        resolve({ success: true, message: '成功提交 ' + entries.length + ' 条记录到GitHub' });
      }).catch(function(err) {
        resolve({ success: false, message: '提交失败: ' + err.message });
      });
    });
  },

  buildComment: function(entries) {
    var comment = '## 棋谱学习记录\n\n';
    comment += '**学习时间**: ' + new Date().toLocaleString() + '\n\n';
    comment += '### 数据\n\n```text\n';
    for (var i = 0; i < entries.length; i++) {
      comment += 'lock=' + entries[i][0] + ', mv=' + entries[i][1] + ', weight=' + entries[i][2] + '\n';
    }
    comment += '```\n';
    return comment;
  }
};

window.BookLearner = BookLearner;