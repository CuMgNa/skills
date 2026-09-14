(function(){
  var stack=[{id:"splash",params:{}}];
  var listeners=[];
  function top(){return stack[stack.length-1];}
  function render(){
    var t=top();
    var root=document.getElementById("screenRoot");
    if(!root)return;
    var fn=window.Screens&&Screens[t.id];
    root.innerHTML=fn?fn({params:t.params,state:Router.state,isTabRoot:stack.length===1}):('<div class="body">未注册屏幕：'+t.id+'</div>');
    var meta=document.getElementById("phoneMeta");
    if(meta) meta.textContent=(window.REQS&&REQS[t.id]&&REQS[t.id].title)||t.id;
    listeners.forEach(function(f){f(t.id,t.params||{});});
  }
  var Router={
    state:{ seq:0, bleConnected:false },
    push:function(id,params){stack.push({id:id,params:params||{}});render();},
    back:function(){if(stack.length>1){stack.pop();render();}},
    replace:function(id,params){stack[stack.length-1]={id:id,params:params||{}};render();},
    goto:function(id,params){stack=[{id:id,params:params||{}}];render();},
    on:function(fn){listeners.push(fn);},
    current:function(){return top().id;}
  };
  window.Router=Router;
  document.addEventListener("DOMContentLoaded",function(){render();});
})();