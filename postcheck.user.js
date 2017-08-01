// ==UserScript==
// @name        postcheck
// @namespace   rapupdategrind
// @description checks for new post
// @include     http://www.rapupdate.de*
// @version     1
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @grant       none
// ==/UserScript==

var checkEveryNSeconds = 20,
    error404URL = '/api',
    timeoutHandle = null,
    poll = function(){
      $.ajax({
        url : error404URL,
        method : 'GET'
      }).always(function(resp){
        
          var latest = resp.match( /\stype-post\s.*href="(.*)"/ )[1],
              current = unsafeWindow.location.toString(),
              slugText = latest.match(/\.de\/(.*)\/?/)[1].replace(/[\-\/]/g,' ');
       
          if(latest !== current){
            $('<a href="'+latest+'" class="alert alert-danger jumbotron">NEUER LINK: '+slugText+'</a>')
              .css({display:'block'})
              .insertBefore('#disqus_thread');
            return;
          }
        
        enqueue();
      });
    },
    enqueue = function(){
      timeoutHandle = setTimeout(poll, checkEveryNSeconds * 1000);
    };
poll();
