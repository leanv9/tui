window.filters = function (){
	return [{after_filter: function(){
		t.parameter("form", t("form").serialize());
		return true;
	}, only: ["chafeng_new.html"]}];
	/**
	 * 过滤器配置，
	 */
	/*return [{before_filter: function(){
	        	alert("没有权限");
	        	return false;
	        }, only: ["index.html"]}];       //过滤器before_filter, after_filter, only: ["index.html","about.html"]只过滤某些文件，except: ["index.html","about.html"]排除某些文件all: true过滤所有，过滤文件夹only_dir: [], except_dir: []
	*/
}