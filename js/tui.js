/**
 * Created by Tang on 2016/2/12.
 */
(function(w) {
	var t = w.$ = w.t = jQuery.noConflict(), width = t(w).width(), height = t(w).height();
	w.gc = {interval: {}};
	t.params = {
		"cache": true,
		"autoload": false, //自动加载
		"async": true, //异步
		//true is development and false is production
		"env": true, //是否开发模式
		"system": "android", //手机系统支持ios, android，影响页面过度效果。
		"preload": false, //预加载
		"animation": false, //动画开关
		"rightTouch": false //右触摸
	}
	
	/**
	 * 配置
	 * @param params 参数
	 */
	t.setting = function(ps) {
		for(param in ps) {
			t.params[param] = ps[param];
		}
	}
	
	/*
	 * nosql cache data
	 */
	function cache() {
		var db, _this = this,
			dbOption = {
				dbname: "tuidb",
				objectStore: "cache",
				indexid: "id",
				version: 3
			}
		/**
		 * 打开数据库
		 */
		this.open = function() {
			var request = indexedDB.open(dbOption.dbname, dbOption.version); // Request version 1
			request.onupgradeneeded = function(event) {
				if(t.params.env) {
					console.log("connect onupgradeneeded!");
				}
				db = request.result;
				var store = db.createObjectStore(dbOption.objectStore);
				var titleIndex = store.createIndex(dbOption.indexid, dbOption.indexid, {
					unique: true
				});
			};
			request.onsuccess = function() {
				if(t.params.env) {
					console.log("connect success!");
				}
				db = request.result;
			};
			//当数据库关闭的时候自动打开
			request.onclose = function() {
				_this.open();
				if(t.params.env) {
					console.log("closed");
				}
			};
			request.onerror = function(e) {
				if(t.params.env) {
					console.log(e.target.error.message);
				}
			};
		}
		/**
		 * 获取store
		 * @param {string} store_name
		 * @param {string} mode either "readonly" or "readwrite"
		 */
		function getObjectStore(store_name, mode) {
			var tx = db.transaction(store_name, mode);
			return tx.objectStore(store_name);
		}
		/***
		 *  清空store
		 * @param {Object} store_name
		 */
		function clearObjectStore(store_name) {
			var store = getObjectStore(dbOption.objectStore, 'readwrite');
			var req = store.clear();
			req.onsuccess = function(evt) {
				if(t.params.env) {
					console.log("clear store success");
				}
			};
			req.onerror = function(evt) {
				if(t.params.env) {
					console.error("clearObjectStore:", evt.target.errorCode);
				}
			};
		}
		/***
		 * 增加/修改数据
		 * @param {Object} data json类型，必须存在id，并且id不能重复。
		 */
		this.put = function(data) {
			if(data && data.id) {
				store = getObjectStore(dbOption.objectStore, "readwrite");
				store.put(data, data.id);
				return data;
			} else {
				return null;
			}
		}
		/***
		 * 读取数据
		 * @param {Object} id 根据标识获取数据
		 * @param {Object} fn 成功读取数据回调函数，回调函数参数为读取的数据。
		 */
		this.get = function(id, fn) {
			store = getObjectStore(dbOption.objectStore, "readonly");
			var index = store.index(dbOption.indexid);
			var request = index.get(id);
			request.onsuccess = function() {
				if(typeof fn === "function") {
					fn.call(this, request.result);
				}
			};
		}
		/***
		 * 删除数据
		 * @param {Object} id 要删除数据的标识
		 */
		this.del = function(id) {
			store = getObjectStore(dbOption.objectStore, "readwrite");
			//store.index(dbOption.indexid);
			var request = store.delete(id);
			request.onsuccess = function(evt) {
				if(t.params.env) {
					console.log("delete successful");
				}
			};
		}
		/**
		 * 页面缓存
		 * set：设置缓存当前页面
		 * 	@params page_id 页面唯一标识
		 * get：获取缓存页面并同步到本页面
		 * 	@params page_id 页面唯一标识
		 *  @params fn 处理完缓存后触发事件
		 */
		this.page = {
			set: function() {
				if(t.current_page) {
					t.cache.data.set(t.current_page, t(".current").html());
					t.cache.data.set(t.current_page + "_form", t(".current form").formToJSON());
				}
			},
			get: function(fn) {
				if(t.current_page) {
					t.cache.data.get(t.current_page, function(data) {
						if(data && data.result) {
							t(".current").html(data.result);
							t(".current").routeClean();
							t.cache.data.get(t.current_page + "_form", function(formdata) {
								if(formdata && formdata.result){
									t("form").bindform(formdata.result);
								}
								t.regist();
								if(typeof fn === "function") {
									fn.call(this);
								}
							    t.cache.data.del(t.current_page);
							    t.cache.data.del(t.current_page + "_form");
							});
						}
					});
				}
			}
		}
		/***
		 * 临时文本缓存方法
		 * set: 设置缓存文本
		 *  @param {Object} dataid 内容标识，推荐使用全路径名称，如："tabs/tab1.html"，也可以使用自定义标识如："tab1_page"。
		 *  @param {Object} dataval 要缓存的html代码。可以为空，有则存之，无则取之。取后清空。
		 * get: 获取缓存数据并删除
		 *  @param {Object} dataid 内容标识
		 * 	@param {Object} fn 获取完缓存后触发事件function(data){data.result}, result为缓存结构。
		 */
		this.data = {
			set: function(dataid, dataval) {
				if(dataval) {
					result = t.cache.put({
						id: dataid,
						result: dataval
					});
				}
			},
			get: function(dataid, fn) {
				if(dataid && typeof fn === "function") {
					t.cache.get(dataid, fn);
				}
			},
			del: function(dataid) {
				t.cache.del(dataid);
			}
		};
	};
	t.cache = new cache();
	
	t._page_temp_cache = {};
	/**
	 * 页面临时缓存
	 */
	t.pageTempCache = {
		set: function(){
			t(".current").routeClean();
			t._page_temp_cache[t.current_page+"_html"] = t(".current").html();
			t._page_temp_cache[t.current_page+"_form"] = t(".current form").formToJSON();
		},
		get: function(fn){
			var htmld = t._page_temp_cache[t.current_page+"_html"];
			if(typeof htmld === "string" && htmld != ""){
				delete(t._page_temp_cache[t.current_page+"_html"]);
				t(".current").html(htmld);
				var formd = t._page_temp_cache[t.current_page+"_form"];
				if(typeof formd === "object" && formd != {}){
					delete(t._page_temp_cache[t.current_page+"_form"]);
					t(".current form").bindform(formd);
				}
				t.regist();
				if(typeof fn === "function") {
					fn.call(this);
				}
			}
		}
	}
	/**
	 * 清理gc内存
	 */
	function gcClear(){
		for(var key in w.gc.interval){
			clearInterval(w.gc.interval[key]);
		}
		w.gc={interval: {}};
	}
	
	t.request = {};
	/**
	 * 设置、获取请求，当参数都存在时，设置请求，否则获取请求。
	 * @param {String} request_url 请求地址
	 * @param {Object} val 请求数据 json类型
	 */
	var requester = function(request_url, val) {
		if(request_url && $.isEmptyObject(val)==false){
			t.request[request_url] = val;
		}else{
			t.request = t.request[t.current_page] || {};
		}
	}
	/**
	 * modal加载过程
	 */
	t.preload = function(style, time) {
		t.preload.open(style);
		setTimeout(function() {
			t.preload.close();
		}, time);
	};
	/**
	 * 加载动画
	 * @param {Object} style
	 */
	t.preload.open = function(style) {
		if(t(".preloader-modal").length < 1 && t(".preloader-modal-write").length < 1){
			switch(style) {
				case "write":
					t("body").prepend(t('<div class="preloader-modal"><span class="preloader-white"></span></div>'));
					break;
				case "black":
					t("body").prepend(t('<div class="preloader-modal-write"><span class="preloader"></span></div>'));
					break;
				default:
					t("body").prepend(t('<div class="preloader-modal-write"><span class="preloader"></span></div>'));
					break;
			}
		}
	}
	t.preload.close = function() {
		t(".preloader-modal").remove();
		t(".preloader-modal-write").remove();
	}
	/**
	 * 事件变量初始化
	 */
	var beforePre = [],
		afterPre = [],
		beforeNext = [],
		afterNext = [];
	//增加页面事件
	//action，页面加载动作：beforePre上一页加载之前触发，afterPre上一页之后，beforeNext下一页之前，afterNext下一页之后。
	//onevent，触发事件。
	t.eventAdd = function(action, onevent) {
		if(typeof onevent === "function" && (action == "beforePre" || action == "afterPre" || action == "beforeNext" || action == "afterNext" || action == "load")) {
			eval(action + ".push(onevent);");
		}
	}
	//页面事件触发
	//action，页面加载动作：beforePre上一页之前触发，afterPre上一页之后，beforeNext下一页之前，afterNext下一页之后。
	t.eventLoad = function(action) {
		if(action == "beforePre" || action == "afterPre" || action == "beforeNext" || action == "afterNext" || action == "load") {
			eval("for(var i=0;i<" + action + ".length;i++){" + action + "[i].call(this);}");
		}
	}
	
	/**
	 * 上一页加載之前事件
	 */
	function prePageBefore() {
		gcClear();
		t.eventLoad("beforePre");
		if(typeof t.onJump === "function"){
			t.onJump.call(this);
			t.onJump = null;
		}
	}
	/**
	 * 上一页加載之后事件
	 */
	function prePageAfter() {
		t.regist();
		t.eventLoad("afterPre");
		if(typeof t.onLoad === "function"){
			t.onLoad.call(this);
			t.onLoad = null;
		}
	}
	/**
	 * 到上一页
	 */
	t.toPrePage = function(url, data) {
		if(t.params.env){
			console.log(url);
		}
		if(url) {
			data = data || {};
			requester(url, data);
			prePageBefore();
			t.get(url, data, function(result) {
				t.current_page = url;
				requester();
				if(t.params.animation) {
					t(".page").css({"pointer-events": "none"});
					if(t.params.system == "android"){
						var curr = t(".page .current").removeClass("current").addClass("pre").addClass("top-to-bottom-50").attr("style", "z-index: 99;");
						try{
							t(".page").append('<div class="current">' + result + '</div>');
						}catch(e){
							if(t.params.env){
								console.error(url+"错误:", e);
							}
						}
						setTimeout(function() {
							curr.remove();
							t(".page").css({"pointer-events": "auto"});
							prePageAfter();
						}, 200);
					}else if(t.params.system == "ios"){
						var curr = t(".page .current").removeClass("current").addClass("pre").addClass("left-to-right").attr("style", "z-index: 99;");
						try{
							t(".page").append('<div class="current left-to-center">' + result + '</div>');
						}catch(e){
							if(t.params.env){
								console.error(url+"错误:", e);
							}
						}
						setTimeout(function() {
							curr.remove();
							t(".left-to-center").removeClass("left-to-center");
							t(".page").css({"pointer-events": "auto"});
							prePageAfter();
						}, 400);
					}else{
						if(t.params.env){
							console.error("请选择您的系统：ios或android");
						}
					}
				} else {
					t(".page .current").remove();
					try{
						t(".page").append('<div class="current">' + result + '</div>');
					}catch(e){
						if(t.params.env){
							console.error(url+"错误:", e);
						}
					}
					prePageAfter();
				}
			});
		}
	}
	/**
	 * 到下一页
	 */
	t.toNextPage = function(url, data) {
		if(t.params.env){
			console.log(url);
		}
		if(url) {
			data = data || {};
			requester(url, data);
			nextPageBefore();
			t.get(url, data, function(result) {
				t.current_page = url;
				requester();
				if(t.params.animation) {
					t(".page").css({"pointer-events": "none"});
					var prepage = t(".page .current");
					prepage.removeClass("current").addClass("pre");
					if(t.params.system == "android"){
						try{
							t(".page").append('<div class="current bottom-to-top-50">' + result + '</div>');
						}catch(e){
							if(t.params.env){
								console.error(url+"错误:", e);
							}
						}
						setTimeout(function() {
							prepage.remove();
							t(".bottom-to-top-50").removeClass("bottom-to-top-50");
							t(".page").css({"pointer-events": "auto"});
							nextPageAfter();
						}, 200);
					}else if(t.params.system == "ios"){
						prepage.addClass("center-to-left");
						try{
							t(".page").append('<div class="current right-to-left">' + result + '</div>');
						}catch(e){
							if(t.params.env){
								console.error(url+"错误:", e);
							}
						}
						setTimeout(function() {
							prepage.remove();
							t(".right-to-left").removeClass("right-to-left");
							t(".page").css({"pointer-events": "auto"});
							nextPageAfter();
						}, 400);
					}else{
						if(t.params.env){
							console.error("请选择您的系统：ios或android");
						}
					}
				} else {
					t(".page .current").remove();
					try{
						t(".page").append('<div class="current">' + result + '</div>');
					}catch(e){
						if(t.params.env){
							console.error(url+"错误:", e);
						}
					}
					nextPageAfter();
				}
			});
		}
	}
	/**
	 * 下一页加载之前事件
	 */
	function nextPageBefore() {
		gcClear();
		t.eventLoad("beforeNext");
		if(typeof t.onJump === "function"){
			t.onJump.call(this);
			t.onJump = null;
		}
	}
	/**
	 * 下一頁加載之后事件
	 */
	function nextPageAfter() {
		if(t.params.rightTouch) {
			t(".page .current").touchAction("right", function(e) {
				t(this).attr("style", "position: fixed");
			}, function(e) {
				if(e.x > 0) {
					t(this).attr("style", "transform: translate3d(" + e.x + "px, 0, 0); -webkit-transform: translate3d(" + e.x + "px, 0, 0); position: fixed;");
				}
			}, function(e) {
				if(e.endX > 0 && e.endX < width * 0.5) {
					t(this).attr("style", "transform: translate3d(0, 0, 0); -webkit-transform: translate3d(0, 0, 0); position: fixed;");
					t(this).removeAttr("style");
				} else if(e.endX >= width * 0.5) {
					t(this).attr("style", "transform: translate3d(100%, 0, 0); -webkit-transform: translate3d(0, 0, 0); position: fixed;");
					t(".page .pre").removeClass("pre").addClass("current");
					t(this).remove();
					t.regist();
					t.eventLoad("afterNext");
				}
			});
		} else {
			t.regist();
			t.eventLoad("afterNext");
		}
		if(typeof t.onLoad === "function"){
			t.onLoad.call(this);
			t.onLoad = null;
		}
	}
	/**
	 * 发送请求
	 * @param {Object} action 动作 get、post
	 * @param {Object} url 网址
	 * @param {Object} data 数据
	 * @param {Object} fn 成功回调
	 * @param {Object} _config 设置提交请求配置， {cache: true, encode: true}开启缓存，开启转换中文。
	 */
	var sendRequest = function(action, url, data, fn, configs) {
		if(url) {
			_config = {
				cache: false,
				encode: false
			}
			for(c in configs) {
				_config[c] = configs[c];
			}
			if(t.params.preload) {
				t.preload.open("black");
			}
			if(_config.cache) {
				t.cache.data.get(url + "?" + t.jsonToparams(data), function(objdb) {
					if(objdb && objdb.result) {
						if(typeof fn === "function") {
							fn.call(this, objdb.result);
						}
						if(t.params.preload) {
							t.preload.close();
						}
					} else {
						if(_config.encode){
							for(var k in data) {
								data[k] = encodeURI(data[k]);
							}
						}
						t.ajax({
							type: action,
							async: t.params.async,
							url: url,
							data: data,
			                xhrFields: {
			                    withCredentials: true
			                },
				            crossDomain: true,
							dataType: "json",
							success: function(result) {
								//缓存数据
								t.cache.data.set(url + "?" + t.jsonToparams(data), result);
								if(typeof fn === "function") {
									fn.call(this, result);
								}
							},
							error: function() {
								t.alert("服务器链接出错！");
								if(t.params.env) {
									console.log("ajax request error! code in sendRequest");
								}
							},
							complete: function(XHR, TS) {
								if(t.params.preload) {
									t.preload.close();
								}
								XHR = null;
							}
						});
					}
				});
			} else {
				if(_config.encode){
					for(var k in data) {
						data[k] = encodeURI(data[k]);
					}
				}
				t.ajax({
					type: action,
					async: t.params.async,
					url: url,
					data: data,
	                xhrFields: {
	                    withCredentials: true
	                },
		            crossDomain: true,
					dataType: "json",
					success: function(result) {
						if(typeof fn === "function") {
							fn.call(this, result);
						}
					},
					error: function() {
						t.alert("服务器链接出错！");
						if(t.params.env) {
							console.log("ajax request error! code in sendRequest");
						}
					},
					complete: function(XHR, TS) {
						if(t.params.preload) {
							t.preload.close();
						}
						XHR = null;
					}
				});
			}
		}
	}
	/*
	 * 发送请求，用于向服务器发送请求，请求成功后，会自动关闭
	 * @param url 要加载的html文件
	 * @param data 发送数据
	 * @param fn 回调地址
	 * @param _config 请求配置
	 */
	t.sendGet = function(url, data, fn, _config) {
		sendRequest("get", url, data, fn, _config);
	}
	
	/*
	 * 发送请求，用于向服务器发送请求，请求成功后，会自动关闭
	 * @param url 要加载的html文件
	 * @param data 发送数据
	 * @param fn 回调地址
	 * @param _config 请求配置
	 */
	t.sendPost = function(url, data, fn, _config) {
		sendRequest("post", url, data, fn, _config);
	}
	t.radioRegist = function() {
		if(t(".link_item.radio").length > 0) {
			t(".link_item.radio[handled!=true]").attr("handled", true).click(function() {
				var rd = t(this).find(":radio");
				rd.prop("checked", !rd[0].checked);
			});
		}
	}
	t.checkRegist = function() {
		if(t(".link_item").length > 0) {
			t(".link_item.checkbox[handled!=true]").attr("handled", true).click(function() {
				var ck = t(this).find(":checkbox");
				ck.prop("checked", !ck[0].checked);
			});
		}
	}
	t.formRegist = function() {
		if(t(":file").length > 0) {
			t(":file").change(function() {
				t(":file").next().val(t(this)[0].files[0].name);
			});
		}
	}
	/**
	 * 提前加载
	 */
	t.regist = function() {
		t.routeRegist();
		t.radioRegist();
		t.checkRegist();
		t.formRegist();
		if(typeof t.onLoad === "function") {
			t.onLoad.call(this);
		}
		if(t.params.env){
			console.log("注册页面完成！");
		}
	}
	/**
	 * 路由注册
	 */
	t.routeRegist = function() {
		t(".current a.route[handled!=true]").attr("handled", true).click(function() {
			t('.current a').unbind();
			var onjump = t(this).attr("onjump");
			if(onjump) {
				var jumpfn = eval(onjump);
				if(typeof jumpfn === "function") {
					jumpfn.call(this, this);
				}
			}
			var p = t(this).attr("params");
			p = p && typeof p === "string" ? eval('(' + p + ');') : {};
			t.toNextPage($(this).attr("url"), p);
			return false;
		});
		t(".current a.back[handled!=true]").attr("handled", true).click(function() {
			t('.current a').unbind();
			var onjump = t(this).attr("onjump");
			if(onjump) {
				var jumpfn = eval(onjump);
				if(typeof jumpfn === "function") {
					jumpfn.call(this, this);
				}
			}
			var p = $(this).attr("params");
			p = p && typeof p === "string" ? eval('(' + p + ');') : {};
			t.toPrePage($(this).attr("url"), p);
			return false;
		});
	}
	/**
	 * 清洗某个区域路由handle
	 */
	t.fn.routeClean = function() {
		t(this).find('[handled=true]').removeAttr("handled").unbind("click");
		return this;
	}
	/***
	 * session以后用于持久化存储数据
	 * @param {Object} name 键
	 * @param {Object} value 值，如果值不存在则取值，如果值为null则清空session
	 */
	t.session = function(name, value) {
		if(value) {
			sessionStorage.setItem(name, JSON.stringify(value));
		} else if(typeof value === "null") {
			sessionStorage.removeItem(name);
		} else if(typeof value === "undefined") {
			return JSON.parse(sessionStorage.getItem(name));
		}
		return;
	}
	/**
	 * tab初始化
	 * @param local 初始化显示选中tab的位置，从0开始
	 */
	t.fn.tabInit = function(id) {
		var _this = this;
		if(id && id != "") {
			t('[href="#' + id + '"]').tabSet(_this);
		}
		t(_this).find(".tab-link").click(function() {
			t(this).tabSet(_this);
			return false;
		});
		return this;
	}
	/**
	 * tab设置  设置当前tab。
	 */
	t.fn.tabSet = function(obj) {
		var _this = this;
		var currtabdiv = t(t(_this).attr("href"));
		t.get(currtabdiv.attr("url"), {}, function(data) {
			currtabdiv.html(data);
			t(_this).addClass("tab-link-active").siblings().removeClass("tab-link-active");
			currtabdiv.addClass("tab-active").removeClass("tab").siblings().not(t(obj)).removeClass("tab-active").addClass("tab");
			t.regist();
		});
		return this;
	}
	/**
	 * tab初始化
	 * 上部TAB
	 */
	t.fn.tabInitUp = function(id) {
		var _this = this;
		if(id && id != "") {
			t('[href="#' + id + '"]').tabSetUp(_this);
		}
		t(_this).find(".tab-link-up").click(function() {
			t(this).tabSetUp(_this);
			return false;
		});
		return this;
	}
	/**
	 * 上部tab设置  设置当前tab。
	 */
	t.fn.tabSetUp = function(obj) {
		var _this = this;
		var currtabdiv = t(t(_this).attr("href"));
		t.get(currtabdiv.attr("url"), {}, function(data) {
			currtabdiv.html(data);
			t(_this).addClass("tab-link-active").siblings().removeClass("tab-link-active");
			currtabdiv.addClass("tab-active2").removeClass("tab").siblings().not(t(obj)).removeClass("tab-active2").addClass("tab");
			t.regist();
		});
		return this;
	}
	/**
	 * 轮播图
	 * @param isloop 是否是自动循环轮播，默认false触摸轮播
	 * @param time   当是自动循环轮播时，设置自动轮播循环的时间，默认3秒
	 * @constructor
	 */
	t.fn.slide = function(isloop, time) {
		var _this = this, num = t(this).find(".slide-items .slide-item").length;
		time = time || 3000;
		isloop = isloop || false;
		init();
		/**
		 * 获取当前轮播位置
		 */
		function currNum() {
			return parseInt(t(_this).find('.slide-paginations .active').attr("curr_num"));
		}
		/**
		 * 上一个点
		 */
		function prePagination() {
			if(currNum() > 1) {
				t(_this).find('.slide-paginations .active').removeClass("active").prev().addClass("active");
			} else if(isloop) {
				t(_this).find('.slide-paginations .active').removeClass("active");
				t(_this).find('.slide-pagination').eq(-1).addClass("active");
			}
		}
		/**
		 * 下一个点
		 */
		function nextPagination() {
			if(currNum() < t(_this).find('.slide-pagination').length) {
				t(_this).find('.slide-paginations .active').removeClass("active").next().addClass("active");
			} else if(isloop) {
				t(_this).find('.slide-paginations .active').removeClass("active");
				t(_this).find('.slide-pagination').eq(0).addClass("active");
			}
		}
		/**
		 * 初始化轮播，初始化轮播宽度和轮播下面的导航点。
		 */
		function init() {
			t(_this).attr("style", "width: " + width + "px;" + t(_this).attr("style"));
			var paginations = '';
			for(var i = 0; i < num; i++) {
				if(i == 0) {
					paginations += '<div class="slide-pagination active" curr_num="' + (i + 1) + '"></div>';
				} else {
					paginations += '<div class="slide-pagination" curr_num="' + (i + 1) + '"></div>';
				}
			}
			t(_this).find('.slide-paginations').html(paginations);
			isloop == true ? loop() : start();
		}
		/**
		 * 触摸轮播
		 */
		function start() {
			t(_this).find(".slide-items .slide-item").touchAction("move", null,
				function(e) {
					function setPosition(x) {
						t(_this).find(".slide-items").attr("style", "transform: translate3d(" + x + "px, 0, 0); -webkit-transform: translate3d(" + x + "px, 0, 0);");
					}
					var curr_num = currNum();
					var distanceX = 0;
					if(e.distanceX > 0) { //to left
						if(1 <= curr_num && curr_num < num) {
							distanceX = -e.distanceX - width * (curr_num - 1);
							setPosition(distanceX);
						}
					} else if(e.distanceX < 0) { //to right
						if(curr_num > 1 && curr_num <= num) {
							distanceX = -(width * (curr_num - 1) + e.distanceX);
							setPosition(distanceX);
						}
					}
				},
				function(e) {
					function setPosition(x) {
						t(_this).find(".slide-items").attr("style", "transform: translate3d(" + x + "px, 0, 0); -webkit-transform: translate3d(" + x + "px, 0, 0);transition-duration: 800ms;-webkit-transition-duration: 800ms;");
					}
					var curr_num = currNum();
					var distanceX = 0;
					if(Math.abs(e.distanceX) > width * 0.25) {
						if(e.distanceX > 0) { //to left
							if(1 <= curr_num && curr_num < num) {
								distanceX = -(width * curr_num);
								setPosition(distanceX);
								nextPagination();
							}
						} else if(e.distanceX < 0) { //to right
							if(curr_num > 1 && curr_num <= num) {
								distanceX = -(width * (curr_num - 2));
								setPosition(distanceX);
								prePagination();
							}
						}
					} else {
						distanceX = -(width * (curr_num - 1));
						setPosition(distanceX);
					}
				}
			);
		}
		/**
		 * 自动轮播
		 */
		function loop() {
			t(_this).find(".slide-items").append(t(_this).find(".slide-items .slide-item").eq(0).clone());
			num++;
			var interval = null,
				clearinterval = null;
			interval = setInterval(function() {
				var curr_num = currNum();
				if(curr_num < num) {
					t(_this).find(".slide-items").attr("style", 'transform: translate3d(-' + (width * curr_num) + 'px, 0px, 0px); -webkit-transform: translate3d(-' + (width * curr_num) + 'px, 0px, 0px); transition-duration: 1300ms;');
					nextPagination();
					if(curr_num == num - 1) {
						setTimeout(function() {
							t(_this).find(".slide-items").attr("style", 'transform: translate3d(0px, 0px, 0px); -webkit-transform: translate3d(0px, 0px, 0px);');
						}, 1300);
					}
				}
			}, time);
			clearinterval = setInterval(function() {
				if(t(_this).find(".slide-items").length <= 0) {
					w.clearInterval(interval);
					w.clearInterval(clearinterval);
				}
			}, 500);
		}
	}
	/**
	 * 多级联动
	 * @param datas 多级下拉的数据集json数组，格式：
	 * var data = [
	 *  {select_id: "#province", value: 2, options: [{id: 1, pid: 0, name: "SS1"}, {id: 2, pid: 0, name: "AA1"}]},
	 *  {select_id: "#city", value: 2, options: [{id: 1, pid: 1, name: "SS2"}, {id: 2, pid: 2, name: "AA2"}]},
	 *  {select_id: "#region", value: 2, options: [{id: 1, pid: 1, name: "SS3"}, {id: 2, pid: 2, name: "AA3"}]}
	 * ]
	 * select_id select下拉选的id， value：选中id值， pid为上级id， name名字， 上下级按数组顺序依次类推
	 */
	t.moreSelect = function(datas) {
		var len = datas.length;
		var init = function(i, select_id) {
			var options = "";
			var selected_id = 0;
			t.each(datas[i].options, function() {
				if(this.pid == select_id || select_id == 0) {
					options = options + '<option value="' + this.id + '" pid="' + this.pid + '">' + this.name + '</option>';
					if(datas[i].value == this.id) {
						selected_id = this.id;
					}
				}
			});
			if(options != "") {
				t(datas[i].select_id).html(options);
				if(selected_id == 0) {
					selected_id = parseInt(t(datas[i].select_id).children().eq(0).val());
				}
				t(datas[i].select_id).val(selected_id);
				if(i < len - 1) {
					init(i + 1, selected_id);
				}
			} else {
				t(datas[i].select_id).html('<option value="">未知</option>');
				if(i < len - 1) {
					init(i + 1, null);
				}
			}
		}
		t.each(datas, function(i) {
			if(i == 0) {
				init(0, 0);
			}
			t(this.select_id).change(function() {
				if(i < len - 1) {
					init(i + 1, parseInt(t(this).val()));
				}
			});
		});
	}
	/**
	 * 开启蒙版
	 * @param style 蒙版风格，默认是灰色半透明，如果参数为"white"则为透明
	 * @param clickcallback 蒙版点击事件
	 */
	t.maskOn = function(style, clickcallback) {
		t(".current").maskOn(style, clickcallback);
	}
	/**
	 * 开启蒙版，在此标签前。
	 * @param style 蒙版风格，默认是灰色半透明，如果参数为"white"则为透明
	 * @param clickcallback 蒙版点击事件
	 */
	t.fn.maskOn = function(style, clickcallback) {
		if(t.params.env){
			console.log("mask on");
		}
		var maskon = t(".mask_on"), maskoff = t(".mask_off");
		if(maskon.length <= 0 && maskoff.length <= 0) {
			maskNode = style == "white" ? t('<div class="mask_on" style="background: none;" offnum="0"></div>') : t('<div class="mask_on" offnum="0"></div>')
			t(this).before(maskNode);
		} else if(maskon.length == 1) {
			var offnum = parseInt(maskon.attr("offnum") || 0)+1;
			maskon.attr("offnum", offnum);
		} else {
			t(".mask_off").removeClass("mask_off").addClass("mask_on");
		}
		if(typeof clickcallback === "function") {
			t(".mask_on").click(function() {
				clickcallback.call(this);
			});
		}
	}
	/**
	 * 关闭蒙版
	 */
	t.maskOff = function() {
		if(t.params.env){
			console.log("mask off");
		}
		var mask_on = t(".mask_on");
		var offnum = parseInt(mask_on.attr("offnum") || 0);
		if(offnum>0){
			mask_on.attr("offnum", offnum-1);
		}else{
			mask_on.addClass("mask_off").removeClass("mask_on");
			setTimeout(function() {
				mask_on.remove();
			}, 300);
		}
	}
	/**
	 * 提示框
	 * @param content 提示框內容
	 */
	t.alert = function(content, fn, style) {
		var img = "imgs/tanhao.png";
		if(style=="success"){
			img = "imgs/duihao.png";
		}
		var popup = t('<div class="popup"><div class="popup-msg"><div class="popup-title"><img src="'+img+'" width="60px" height="60px" /></div><div class="popup-content">' + content + '</div></div><div class="popup-btn"><a href="javascript:;" class="btn btn-sm bg_blue">确定</a></div></div>');
		t.maskOn();
		t("body").append(popup.addClass("popup-show"));
		popup.find("a").click(function() {
			t(this).unbind();
			if(typeof fn === "function") {
				fn.call(this);
			}
			t.maskOff();
			popup.remove();
			return false;
		});
	}
	/**
	 * 信息框
	 * @param title 信息标题
	 * @param content 信息内容
	 * @param onPopupClick 信息点击回调事件
	 */
	t.confirm = function(content, onPopupClick) {
		var popup = t('<div class="popup"><div class="popup-msg"><div class="popup-title"><img src="imgs/tanhao.png" width="60px" height="60px" /></div><div class="popup-content">' + content + '</div></div><div class="popup-btn"><a href="javascript:;" class="btn btn-sm bg_blue btn-50">确定</a><a href="javascript:;" class="btn btn-sm bg_orange btn-50">取消</a></div></div>');
		t.maskOn();
		t("body").append(popup.addClass("popup-show"));
		popup.find("a").click(function() {
			popup.find("a").unbind();
			if(typeof onPopupClick === "function") {
				var obj = {};
				obj.action = t(this).text();
				onPopupClick.call(this, obj);
				t.maskOff();
			}else{
				t.maskOff();
			}
			popup.remove();
			return false;
		});
	}
	/**
	 * 自定义消息（alert）
	 * @param popup_id      要弹出的消息的div的id，即装载消息的div的id
	 * @param onPopupClick  消息弹出后，消息按钮的点击事件
	 */
	t.fn.popup = function(onPopupClick) {
		var _this = this, parent = t(_this).parent();
		t("body").append(_this);
		t.maskOn();
		t(_this).addClass("popup-show");
		t(_this).find("a[handle!='true']").attr("handle", "true").click(function() {
			var obj = {};
			obj.action = t(this).text();
			if(typeof onPopupClick === "function") {
				var result = onPopupClick.call(this, obj);
				result = typeof result != "boolean" ? true : result;
				if(result){
					t.maskOff();
					t(parent).append(t(_this).removeClass("popup-show"));
					t(this).removeAttr("handle").unbind();
				}
			}else{
				t.maskOff();
				t(parent).append(t(_this).removeClass("popup-show"));
				t(this).removeAttr("handle").unbind();
			}
			return false;
		});
	}
	/**
	 * action sheet 底部上滑出菜单。
	 * @param popupAction_id   要滑出的菜单的div的id，即action sheet的id
	 * @param onPopupActionClick  滑出的菜单上面的按钮点击触发事件
	 */
	t.fn.popupAction = function(onPopupActionClick) {
		var _this = this, parent = t(this).parent();
		t("body").append(t(_this));
		t(_this).addClass("popup-action-show");
		t.maskOn(null, function(){
			t.maskOff();
			t(parent).append(t(_this).removeClass("popup-action-show"));
		});
		t(_this).find(".action-btn").click(function(){
			t(this).unbind();
			var obj = {};
			obj.action = t(this).text();
			t.maskOff();
			t(parent).append(t(_this).removeClass("popup-action-show"));
			if(typeof onPopupActionClick === "function") {
				onPopupActionClick.call(this, obj);
			}
		});
	}
	/**
	 * 聊天类
	 */
	t.message = function(data) {
		var msg = this, name, img;
		t(".current .send-btn[handlesd!=true]").attr('handled', true).click(function() {
			msg.send(t(".current .send_content").val());
			t(".current .content").scrollTop(t(".page .current .content")[0].scrollHeight);
			t(".current .send_content").val("");
			t(".current .toolbar").attr("style", "height: 50px");
			t(".current .send_content").attr("style", "height: 28px");
			return false;
		});
		t(".send_content[handled!=true]").attr('handled', true).keyup(function() {
			var scrolh = t(".send_content")[0].scrollHeight + 2;
			t(".current .send_content").attr("style", "height:" + (scrolh) + "px");
			t(".current .toolbar").attr("style", "height:" + (scrolh + 50 - 28) + "px");
		});
		if(data) {
			name = data.name, img = data.image;
			t.each(data.contents, function() {
				if(this.send) {
					t('.current .message').append(getSendHtml(this.send));
				}
				if(this.receive) {
					t('.current .message').append(getReceiveHtml(this.receive));
				}
				if(this.date) {
					t('.current .message').append(getDate(this.date));
				}
			});
			t(".current .content").scrollTop(t(".page .current .content")[0].scrollHeight);
		}
		/**
		 * 发送信息
		 * @param content 发送的信息内容
		 */
		msg.send = function(content) {
			content = t.trim(content);
			if(content) {
				if(typeof msg.onSend === "function") {
					msg.onSend.call(msg, content);
				}
				t('.current .message').append(getSendHtml({
					message: content
				}));
			}
		}
		/**
		 * 接收的消息写入到聊天界面
		 * @param data 接收的消息
		 */
		msg.receive = function(data) {
			t('.current .message').append(getReceiveHtml(data));
			if(typeof msg.onReceive === "function") {
				msg.onReceive.call(msg, data);
			}
		}
		/**
		 * 日期写入到聊天界面
		 * @param date 时间
		 */
		msg.date = function(date) {
			t('.current .message').append(getDate(date));
		}
		/**
		 * 获取时间html代码
		 * @param date 时间
		 * @returns {string} 返回聊天界面的时间的html代码
		 */
		function getDate(date) {
			return date ? t('<div class="message-date"></div>').text(date) : '';
		}
		/**
		 * 获取发送消息的html代码
		 * @param content 消息内容
		 * @returns {*}  聊天界面的消息内容的html代码
		 */
		function getSendHtml(data) {
			if(data) {
				var sendhtml = '<div class="send"><div class="msg-content">';
				if(name) {
					sendhtml += '<div class="msg-name">' + name + '</div>';
				}
				if(data.message) {
					sendhtml += '<div class="msg-text">' + data.message + '</div>';
				}
				sendhtml += "</div>";
				if(img) {
					sendhtml += '<img class="msg-image" src="' + img + '" />';
				}
				sendhtml += "</div>";
				return sendhtml;
			} else {
				return '';
			}
		}
		/**
		 * 获取返回消息的html代码
		 * @param data 返回的消息数据
		 * @returns {*} 返回消息数据的html代码
		 */
		function getReceiveHtml(data) {
			if(data) {
				var receivehtml = '<div class="received">';
				if(data.image) {
					receivehtml += '<img class="msg-image" src="' + data.image + '" />';
				}
				receivehtml += '<div class="msg-content">';
				if(data.name) {
					receivehtml += '<div class="msg-name">' + data.name + '</div>';
				}
				if(data.message) {
					receivehtml += '<div class="msg-text">' + data.message + '</div>';
				}
				receivehtml += "</div></div>";
				return receivehtml;
			} else {
				return '';
			}
		}
	}
	/**
	 * 上拉刷新
	 * @param listener 上拉成功后触发事件
	 */
	t.fn.upPull = function(listener) {
		var _this = this;
		t(_this).unbind().touchAction("up", function(e) {}, function(e) {}, function(e) {
			if(t.params.env){
				console.log(window.document.body.offsetHeight);
				console.log(t(_this)[0].scrollHeight);
				console.log(t(_this).offset().top);
			}
			if(window.document.body.offsetHeight-t(_this)[0].scrollHeight>=t(_this).offset().top && typeof listener === "function") {
				listener.call(_this);
				if(t.params.env){console.log("call");}
			}
		});
	}
	/**
	 * 下拉刷新
	 * @param listener 下拉刷新后触发的事件
	 */
	t.downPull = function(listener) {
		var initScrollTop = 0;
		t(".current .content").touchAction("move", function(e) {
			initScrollTop = t(this).scrollTop();
		}, function(e) {
			if(e.distanceY < 0 && t(".page .current .content").scrollTop() == 0) {
				var distancey = (Math.abs(e.distanceY) / 4);
				t(this).attr("style", "transform: translate3d(0," + distancey + "px, 0);-webkit-transform: translate3d(0," + distancey + "px, 0);");
				if(distancey >= 38) {
					t(".pull-to-down").addClass("pull-to-down-to-up");
				}
			} else {
				t(this).scrollTop(initScrollTop + e.distanceY);
			}
		}, function(e) {
			var distancey = (Math.abs(e.distanceY) / 4);
			t(".pull-to-down").removeClass("pull-to-down-to-up");
			t(this).attr("style", "transform: translate3d(0, 0, 0); -webkit-transform: translate3d(0, 0, 0);");
			if(e.distanceY < 0 && t(".page .current .content").scrollTop() == 0 && distancey >= 38 && typeof listener === "function") {
				listener.call(this);
			}
		});
	}
	
	/**
	 * 触摸动作处理事件
	 * Created by tang on 2016/2/13
	 * @param action 触摸动作，String类型，值包括：click,left,right,up,down；依次为单击、向左滑动、向右滑动、向上滑动、向下滑动；
	 * @param startListen 触摸开始时触发事件，格式function(e){}，参数e为json，键x，y
	 * @param movingListen 触摸移动时触发的事件，click时不触发，格式function(3){},参数e为json，键x，y
	 * @param endListen 触摸结束时触发的事件，格式function(e){} ,参数e为json，键startX,startY,endX,endY,startTime,endTime,distanceX,distanceY,distanceTime,action
	 * @returns {$} 返回当前对象
	 */
	t.fn.touchAction = function(action, startListen, movingListen, endListen) {
		var e = {},
			swipeRange = 50,
			obj = this;
		e.action = action;
		function touchstart(){
			t(obj).bind("touchstart", function(event){
				//event.preventDefault();
				e.startX = event.originalEvent.targetTouches[0].pageX;
				e.startY = event.originalEvent.targetTouches[0].pageY;
				e.startTime = (new Date()).valueOf();
				if(t.isFunction(startListen)) startListen.call(obj, {
					x: e.startX,
					y: e.startY
				});			
			});
		}
		function touchmove(){
			t(obj).bind("touchmove", function(event){
				e.x = event.originalEvent.targetTouches[0].pageX;
				e.y = event.originalEvent.targetTouches[0].pageY;
				e.distanceX = e.startX - e.x;
				e.distanceY = e.startY - e.y;
				movingListen.call(obj, e);		
			});
		}
		function touchend(){
			t(obj).bind("touchend", function(event){
				e.endX = event.originalEvent.changedTouches[0].pageX;
				e.endY = event.originalEvent.changedTouches[0].pageY;
				e.endTime = (new Date()).valueOf();
				e.distanceX = e.startX - e.endX;
				e.distanceY = e.startY - e.endY;
				var distanceX = Math.abs(e.distanceX),
					distanceY = Math.abs(e.distanceY);
				e.distanceTime = e.endTime - e.startTime;
				if(action === "click" && e.distanceTime < 1000 && distanceX < 10 && distanceY < 10) endListen.call(obj, e);
				else if(action === "left" && distanceX > distanceY && e.endX < e.startX && distanceX > swipeRange) endListen.call(obj, e);
				else if(action === "right" && distanceX > distanceY && e.endX > e.startX && distanceX > swipeRange) endListen.call(obj, e);
				else if(action === "up" && distanceX < distanceY && e.endY < e.startY && distanceY > swipeRange) endListen.call(obj, e);
				else if(action === "down" && distanceX < distanceY && e.endY > e.startY && distanceY > swipeRange) endListen.call(obj, e);
				else if(action === "move") endListen.call(obj, e);	
			});
		}
		if(action === "click") {
			touchstart();
			touchend();
		} else if(action === "left" || action === "right" || action === "up" || action === "down" || action === "move") {
			touchstart();
			touchmove();
			touchend();
		}
		return this;
	}
	/***
	 * 长按事件
	 */
	t.fn.touchLong = function(fn) {
		var timeout;
		$(this).mousedown(function() {
			timeout = setTimeout(function() {
				if(typeof fn === "function") {
					fn.call(this);
				}
			}, 500);
		});
		$(this).mouseup(function() {
			clearTimeout(timeout);
		});
		return this;
	}
	/**
	 * 转换html到字符串并保存在该节点下
	 * @returns {*|jQuery|HTMLElement}
	 */
	t.fn.toText = function() {
		this.text(this.html());
		return this;
	}
	/**
	 * 该节点下字符串转换成html
	 * @returns {*|jQuery|HTMLElement}
	 */
	t.fn.toHtml = function() {
		try {
			this.html(this.text());
		} catch(e) {
			if(t.params.env) {
				console.error('new page javascript error:', e);
			}
		}
		return this;
	}
	/**
	 * 侧边菜单 滑出侧边的菜单
	 * @param menu_id  菜单所在的div的id
	 */
	t.fn.sideMenu = function(menu_id) {
		var menu = t("#" + menu_id);
		var side = this;
		setTimeout(function() {
			t(side).click(function() {
				menu.openMenu();
				return false;
			});
		}, 300);
		return this;
	}
	/**
	 * 打开左侧menu
	 */
	t.fn.openMenu = function() {
		var currentMenu = this;
		currentMenu.attr("style","z-index:100").addClass("left_active");
		currentMenu.maskOn(null, function() {
			currentMenu.closeMenu();
		});
		currentMenu.find("a.link_item").click(function() {
			var url = t(this).unbind().attr("href");
			currentMenu.closeMenu(function(){
				t.toNextPage(url);
			});
			return false;
		});
		return currentMenu;
	}
	/**
	 * 关闭左侧menu
	 * @param fn 关闭后触发事件
	 */
	t.fn.closeMenu = function(fn) {
		var currentMenu = this;
		currentMenu.removeClass("left_active");
		t.maskOff();
		setTimeout(function() {
			t(".current").prepend(currentMenu);
			if(typeof fn=="function"){
				fn.call(currentMenu);
			}
		}, 450);
		return currentMenu;
	}
	t.fn.popMenu = function(clickfn){
		var _this = this, menuset = function(style, fn){
			_this.addClass(style);
			setTimeout(function(){
				_this.removeClass(style);
				if(typeof fn === "function"){
					fn.call(_this);
				}
			}, 300);
			return _this;
		}, close = function(fn){
			t.maskOff();
			menuset("menu-pop-hide", function(){
				_this.css({"opacity": 0, "z-index": -1});
				if(typeof fn === "function"){
					fn.call(_this);
				}
			});
			return _this;
		};
		_this.find(".pop_menu_btn").unbind().click(function(){
			var a = this;
			close(function(){
				if(typeof clickfn === "function"){
					clickfn.call(a, {action: t(a).text()});
				}
			});
		});
		_this.maskOn("white", function(){
			close();
		});
		_this.css({"opacity": 1, "z-index": 1000});
		menuset("menu-pop-show", null);
		return _this;
	}
	/**
	 * 表单转换成json数据。
	 */
	t.fn.formToJSON = function() {
		var arrayData, objectData;
		arrayData = this.serializeArray();
		objectData = {};
		t.each(arrayData, function() {
			var value;
			if(this.value != null) {
				value = this.value;
			} else {
				value = '';
			}
			if(objectData[this.name] != null) {
				if(!objectData[this.name].push) {
					objectData[this.name] = [objectData[this.name]];
				}
				objectData[this.name].push(value);
			} else {
				objectData[this.name] = value;
			}
		});
		return objectData;
	};
	/**
	 * 绑定表单数据
	 * @param {Object} data 服务器返回的json数据自动绑定到form表单，返回json名必须和form的name名一样。
	 */
	t.fn.bindform = function(data) {
		var current_this = this;
		t.each(data, function(name, value) {
			var ct = t(current_this).find('[name="' + name + '"]');
			if(ct.attr("type") == "radio" || ct.attr("type") == "checkbox") {
				t(current_this).find('input[name=' + name + '][value=' + value + ']').attr("checked", true);
			} else if(value.push) {
				for(var i = 0; i < ct.length; i++) {
					t(ct[i]).val(value[i]);
				}
			} else {
				ct.val(value);
			}
		});
		return this;
	}
	/**
	 * 表单验证
	 * @param {Object} data
	 */
	t.fn.validate = function(data){
		var messages = [], datas = data.rules;
		//{"name": {require: {message: ""}, length: {max: 10, min:1,message: ""}, regex: {regex: //, message: ""}, cd: {message: ""}, phone: {message: ""}, type: {type: "number/float", message:""}}
		for(var k in datas){
			var val, nod = t('[name="'+k+'"]');
			if(nod.is("input")){
				var nodtype = nod.attr('type');
				val = nodtype=="checkbox" || nodtype=="radio" ? t('[name='+datas[k]+']:checked').val() : nod.val();
			}else if(nod.is("select")){
				val = nod.find("option:selected").val();
			}else if(nod.is("textarea")){
				val = nod.val();
			}
			var rule = datas[k];
			for(var yzk in rule){
				if(yzk=="require" && !(val && val!="")){
					messages.push(rule[yzk].message);
				}else if(yzk=="length"){
					if(rule[yzk].max && !(val.length <= rule[yzk].max)){
						console.log("max:"+rule[yzk].message);
						messages.push(rule[yzk].message);
					}
					if(rule[yzk].min && !(val.length >= rule[yzk].min)){
						messages.push(rule[yzk].message);
					}
				}else if(yzk=="regex"){
					if(!rule[yzk].regex.test(val)){
						messages.push(rule[yzk].message);
					}
				}else if(yzk=="cd"){
					if(val.length!=18){
						messages.push(rule[yzk].message);
					}
				}else if(yzk=="phone"){
					if(val.length!=11 || !(/^\+?[1-9][0-9]*$/.test(val))){
						messages.push(rule[yzk].message);
					}
				}else if(yzk=="type"){
					var rg;
					if(rule[yzk].type=="number"){
						rg = /^-?\d+$/;
					}else if(rule[yzk].type=="+number"){
						rg = /^\+?[1-9][0-9]*$/;
					}else if(rule[yzk].type=="-number"){
						rg = /^-[0-9]*[1-9][0-9]*$/;
					}else if(rule[yzk].type=="float"){
						rg = /^(-?\d+)(\.\d+)?$/;
					}else if(rule[yzk].type=="+float"){
						rg = /^(([0-9]+\.[0-9]*[1-9][0-9]*)|([0-9]*[1-9][0-9]*\.[0-9]+)|([0-9]*[1-9][0-9]*))$/;
					}else if(rule[yzk].type=="-float"){
						rg = /^(-(([0-9]+\.[0-9]*[1-9][0-9]*)|([0-9]*[1-9][0-9]*\.[0-9]+)|([0-9]*[1-9][0-9]*)))$/;
					}else if(rule[yzk].type=="decimal"){
						rg = /(^[1-9]([0-9]+)?(\.[0-9]{1,2})?$)|(^(0){1}$)|(^[0-9]\.[0-9]([0-9])?$)/;
					}
					if(!(rg.test(val))){
						messages.push(rule[yzk].message);
					}
				}
			}
		}
		if(messages.length>0 && typeof data.onerror === "function"){
			data.onerror.call(this, messages);
		}else if(typeof data.onsuccess === "function"){
			data.onsuccess.call(this);
		}
	}
	
	//获取语音合成结果
	//参数text，要转换成语音的文本
	t.fn.textAudio = function(text, token){
    	t(this).attr("src", 'http://tsn.baidu.com/text2audio?tex='+text+'&lan=zh&cuid=tui_audio_19850831&ctp=1&tok='+token);
    	return this;
    }
	
	/**
	 * 字符串转换成json数据，用于服务器返回。
	 * @param {Object} str 字符串
	 * @return 返回json对象
	 */
	t.toJson = function(str) {
		return eval('(' + str + ');');
	}
	/**
	 * 把json对象转换成网址参数
	 * @param {Object} j
	 */
	t.jsonToparams = function(j) {
		var s = "";
		for(var i in j) {
			s += "&" + i + "=" + j[i]
		}
		return s;
	}
	/**
	 * 序列转换成json
	 * @str form序列字符串。
	 */
	t.serializeToJson = function(str) {
		str = str.replace(/&/g, "','");
		str = str.replace(/=/g, "':'");
		str = "({'" + str + "'})";
		obj = eval(str);
		return obj;
	}
	/**
	 * 消息 上面下滑出如系统消息的自定义消息
	 * @param message  消息内容
	 * @param onNoticeClick  消息弹出后的消息点击事件
	 */
	t.notice = function(message, onNoticeClick) {
		var notice = t(".notice");
		if(notice.length <= 0) {
			notice = t('<div class="notice"><div class="notice-content">' + message + '</div><i class="notice_close"></i></div>');
			t("body").prepend(notice);
		}
		function notice_close() {
			notice.removeClass("notice_show");
			setTimeout(function() {
				notice.remove();
			}, 450);
		}
		notice.click(function() {
			if(typeof onNoticeClick === "function") {
				onNoticeClick.call(notice);
			}
			notice_close();
		});
		notice.find(".notice_close").click(function() {
			notice_close();
		});
		notice.addClass("notice_show");
	}
	/**
	 * 应用通知打开
	 * @param message 通知内容
	 * @param noticeClickCallback 点击通知后触发的事件
	 * @returns {*} 返回通知的节点
	 */
	t.appNoticeOpen = function(message, noticeClickCallback) {
		var notice = t(".notice_app");
		if(notice.length <= 0) {
			notice = t('<div class="notice_app notice_app_show"><div class="notice-content">' + message + '</div></div>');
			t(".current").prepend(notice);
		}
		if(typeof noticeClickCallback === "function") {
			notice.click(function() {
				noticeClickCallback.call(this);
				return false;
			});
		}
		setTimeout(function() {
			notice.removeClass("notice_app_show");
		}, 450);
		return notice;
	}
	/**
	 * 关闭应用通知
	 * @param notice 要关闭的通知的节点。
	 */
	t.appNoticeClose = function(notice) {
		t(notice).addClass("notice_app_hide");
		setTimeout(function() {
			notice.remove();
		}, 450);
	}
	/**
	 * cookie对象
	 * t.cookie('the_cookie'); // 读取 cookie
	 * t.cookie('the_cookie', 'the_value'); // 存储 cookie
	 * t.cookie('the_cookie', 'the_value', { expires: 7 }); // 存储一个带7天期限的 cookie
	 * t.cookie('the_cookie', '', { expires: -1 }); // 删除 cookie 或者用t.removeCookie(key)
	 */
	var pluses = /\+/g;
	function encode(s) {
		return config.raw ? s : encodeURIComponent(s);
	}
	function decode(s) {
		return config.raw ? s : decodeURIComponent(s);
	}
	function stringifyCookieValue(value) {
		return encode(config.json ? JSON.stringify(value) : String(value));
	}
	function parseCookieValue(s) {
		if(s.indexOf('"') === 0) {
			s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
		}
		try {
			s = decodeURIComponent(s.replace(pluses, ' '));
			return config.json ? JSON.parse(s) : s;
		} catch(e) {}
	}
	function read(s, converter) {
		var value = config.raw ? s : parseCookieValue(s);
		return t.isFunction(converter) ? converter(value) : value;
	}
	var config = t.cookie = function(key, value, options) {
		if(value !== undefined && !t.isFunction(value)) {
			options = t.extend({}, config.defaults, options);
			if(typeof options.expires === 'number') {
				var days = options.expires,
					time = options.expires = new Date();
				time.setTime(+time + days * 864e+5);
			}
			return(document.cookie = [
				encode(key), '=', stringifyCookieValue(value),
				options.expires ? '; expires=' + options.expires.toUTCString() : '',
				options.path ? '; path=' + options.path : '',
				options.domain ? '; domain=' + options.domain : '',
				options.secure ? '; secure' : ''
			].join(''));
		}
		var result = key ? undefined : {};
		var cookies = document.cookie ? document.cookie.split('; ') : [];
		for(var i = 0, l = cookies.length; i < l; i++) {
			var parts = cookies[i].split('=');
			var name = decode(parts.shift());
			var cookie = parts.join('=');
			if(key && key === name) {
				result = read(cookie, value);
				break;
			}
			if(!key && (cookie = read(cookie)) !== undefined) {
				result[name] = cookie;
			}
		}
		return result;
	};
	config.defaults = {};
	t.removeCookie = function(key, options) {
		if(t.cookie(key) === undefined) {
			return false;
		}
		t.cookie(key, '', t.extend({}, options, {
			expires: -1
		}));
		return !t.cookie(key);
	};
	/**
	 * 载入js文件
	 * @param {Object} path 文件地址
	 */
	function include(path) {
		var a = document.createElement("script");
		a.type = "text/javascript";
		a.src = path;
		var head = document.getElementsByTagName("head")[0];
		head.appendChild(a);
	}
	/**
	 * 初始化过滤器 filterInit: filters: [{before_filter: f, after_filter: a, only: [], except: [], only_dir: [], except_dir: []}]
	 * action，过滤动作取值：before_filter,after_filter之前、之后过滤器。
	 * currPagePath，当前页全地址。
	 */
	var filterInit = function(action, currPagePath) {
		var filters = w.filters();
		for(var i = 0; i < filters.length; i++) {
			if((action == "before_filter" && typeof filters[i].before_filter === "function") ||
				(action == "after_filter" && typeof filters[i].after_filter === "function")) {
				if(filters[i].only || filters[i].only_dir) {
					var isfilter = false;
					if(filters[i].only_dir) {
						for(var j = 0; j < filters[i].only_dir.length; j++) {
							if(filters[i].only_dir[j] == currPagePath.substr(0, filters[i].only_dir[j].length)) {
								isfilter = true;
								break;
							}
						}
					}
					if(!isfilter) {
						for(var j = 0; j < filters[i].only.length; j++) {
							if(filters[i].only[j] == currPagePath) {
								isfilter = true;
								break;
							}
						}
					}
					if(isfilter) {
						return action == "before_filter" ? filters[i].before_filter.call(this) : filters[i].after_filter.call(this);
					}
				} else if(filters[i].except || filters[i].except_dir) {
					var isfilter = true;
					for(var i = 0; i < filters[i].except_dir.length; i++) {
						if(filters[i].except_dir[i] == currPagePath.substr(0, filters[i].except_dir[i].length)) {
							isfilter = false;
							break;
						}
					}
					if(isfilter) {
						for(var i = 0; i < filters[i].except.length; i++) {
							if(filters[i].except[i] == currPagePath) {
								isfilter = false;
								break;
							}
						}
					}
					if(isfilter) {
						return action == "before_filter" ? filters[i].before_filter.call(this) : filters[i].after_filter.call(this);
					}
				} else if(filters[i].all) {
					return action == "before_filter" ? filters[i].before_filter.call(this) : filters[i].after_filter.call(this);
				}
			}
		}
		return true;
	}
	t.timeStamp = function() {
		return new Date().getTime();
	}
	/**
	 * 自动加载 
	 */
	t(function() {
		include("js/filter.js");
		if(t.params.cache) {
			t.cache.open();
		}
		t.regist();
	});
	
}(window));