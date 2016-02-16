/*Fullpage 简化版本
 *参考慕课网全屏滚动教程，有部分功能删减
 */


(function($) {
	/*闭包——单例模式
	 *自执行的闭包函数ClassBox将返回Fullpage类
	 *通过jQuery原型方法调用
	 */
    var ClassBox = (function() {
        var Fullpage = function(element, settings) {
            this.settings = $.extend(true, $.fn.Fullpage.settings, settings);
            this.element = element;
            this.init();
        };
        Fullpage.prototype = {
        	//预加载功能 页面加载完毕后需立即执行的功能
            init: function() {
                this.sectionBox = this.element.find(this.settings.sectionBox);
                this.section = this.element.find(this.settings.section);

                this.direction = this.settings.direction;
                this.pageCounts = this.getPages();
                this.index = (this.settings.index > 0 && this.settings.index < this.pageCounts) ? this.settings.index : 0;
                this.canScroll = true;

                if (this.settings.direction === "horizontal") {
                    this.initHorizontal();
                }

                if (this.settings.hasCtrlBtn) {
                    this.initCtrlBtn();
                }
                this.initEvent();
                this.section.eq(this.index).addClass('on').siblings('.section').removeClass('on');
            },
            //获取页面总数
            getPages: function() {
                return this.section.size();
            },
            //若横向滚动，对容器与页面的宽度作部分调整
            initHorizontal: function() {
                var width = (this.pageCounts * 100) + "%";
                var cellWidth = (100 / this.pageCounts).toFixed(2) + "%";
                this.sectionBox.width(width);
                this.section.width(cellWidth).addClass('left');
            },
            //Dom事件重写
            initEvent: function() {
                var that = this;
                //浮动按钮点击后滚动
                this.ctrlBtn.on('click', function() {
                    that.index = $(this).index();
                    that.scrollPage();
                });
                //鼠标滚动事件
                /*让我来解释一下……
                 *目前只有Firefox浏览器对原生的mousewheel滚动事件不支持，它使用自己独有的DOMMouseScroll事件。
                 *尚有不同的是每次滚动后的wheelDelta值的表现，如果向上滚动该值应大于零，向下滚动应小于零。
                 *但firefox中替代的detail属性的取值却完全相反。
                 *因此事先对Firefox的Detail值取反。
                 */
                this.element.on('mousewheel DOMMouseScroll', function(event) {
                    var delta = event.originalEvent.wheelDelta || -event.originalEvent.detail;
                    if (delta > 0 && (that.index !== 0 && !that.settings.loop || that.settings.loop)) {
                        that.prevPage();
                    } else if (delta < 0 && (that.index < (that.pageCounts - 1) && !that.settings.loop || that.settings.loop)) {
                        that.nextPage();
                    }
                });

                //css3过渡执行完毕事件，该事件需要添加前缀。
                this.sectionBox.on('webkitTransitionEnd transitionend', function() {
                    if (that.settings.callback && $.type(that.settings.callback) === "function") {
                        that.settings.callback();
                    }
                    that.canScroll = true;
                });
                //键盘操纵事件，上/左即向上一页滚动，下/右为向下滚动
                if (this.settings.keyboard) {
                    $(window).on('keydown', function(event) {
                        var keyCode = event.keyCode;
                        if (keyCode === 37 || keyCode === 38) {
                            that.prevPage();
                        } else if (keyCode === 39 || keyCode === 40) {
                            that.nextPage();
                        }
                    });
                }
                //浏览器窗口尺寸改变事件
                //实测发现在第一页，即this.index===0的时候不能重新滚动，页面会卡死不动。
                $(window).resize(function() {
                    if (that.index!==0) {
                        that.scrollPage();
                    }
                });


            },
            //向上滚动
            prevPage: function() {
                if (this.canScroll) {
                    if (this.index > 0) {
                        this.index--;
                    } else if (this.settings.loop) {
                        this.index = this.pageCounts - 1;
                    }
                }
                this.scrollPage();
            },
            //向下滚动
            nextPage: function() {
                if (this.canScroll) {
                    if (this.index < this.pageCounts - 1) {
                        this.index++;
                    } else if (this.settings.loop) {
                        this.index = 0;
                    }
                }
                this.scrollPage();
            },
            //滚动动画
            /*这里采用Css3过渡的方式进行页面滑动。
             *也可以采用jQuery来滚动页面，但性能相较于CSS3过渡明显差了许多。
             *这里暂不考虑IE10-浏览器的原因，就不考虑jQuery滑动的实现了。
             *（但以后应该会加上
             */
            scrollPage: function() {
                this.canScroll = false;
                var destination = this.section.eq(this.index).position();
                if (!destination) {
                    return;
                }
                this.sectionBox.css('transition', 'all ' + this.settings.duration + 'ms ' + this.settings.easing);
                var translate = (this.settings.direction === 'vertical') ? 'translateY(-' + destination.top + 'px)' : 'translateX(-' + destination.left + 'px)';
                this.sectionBox.css('transform', translate);

                this.section.eq(this.index).addClass('on').siblings('.section').removeClass('on');

                if (this.settings.hasCtrlBtn) {
                    this.ctrlBtn.eq(this.index).addClass(this.activeCls).siblings('li').removeClass(this.activeCls);
                }
            },
            //加载控制按钮
            //这里是从js中将元素插入Dom中，主要是考虑到列表数目可以智能生成
            initCtrlBtn: function() {
                var btnBoxCls = this.settings.ctrlBtnBox.substring(1);
                var btnBox = "<ul class=" + btnBoxCls + ">";
                this.activeCls = this.settings.activeBtnCls.substring(1);

                for (var i = 0; i < this.pageCounts; i++) {
                    btnBox += "<li></li>";
                }
                btnBox += "</ul>";

                this.element.append(btnBox);

                this.ctrlBtnBox = this.element.find("ul" + this.settings.ctrlBtnBox);
                this.ctrlBtn = this.ctrlBtnBox.find("li");
                this.ctrlBtn.eq(this.index).addClass(this.activeCls);

                if (this.direction === "vertical") {
                    this.ctrlBtnBox.addClass('verticalBtn');
                } else if (this.direction === "horizontal") {
                    this.ctrlBtnBox.addClass('horizontalBtn');
                }
            }
        };
        return Fullpage;
    })();

    //fullpage类挂载至jQuery原型
    //这里采用了单例模式，确保实例有且仅有一个存在
    $.fn.Fullpage = function(settings) {
        return this.each(function() {
            var fullpage = $(this).data("fullpage");
            if (!fullpage) {
                fullpage = new ClassBox($(this), settings);
                $(this).data("fullpage", fullpage);
            }
            return fullpage;
        });
    };
    //配置项
    /*由上至下依次为：
     *   sectionBox:所有页面的容器，并不是container
     *   section: 滚动的页面
     *   ctrlBtnBox: 浮动的控制按钮列表
     *   activeBtnCls: 当前显示的页面对应列表项的样式类
     *   index: 页面从第几页开始显示
     *   easing: 滚动动画的时间函数，这里如果要更多复杂的效果需要二次贝塞尔函数或引入easing函数类库
     *   duration: 滚动动画持续时间
     *   loop: 是否可以无限滚动，即第一页向上滚动到最后一页
     *   hasCtrlBtn: 是否使用控制按钮
     *   keyboard: 是否使用键盘控制
     *   direction: 横向/纵向滚动，默认竖向，横向为horizontal
     *   callback: 滚动完成后的回调函数
     */
    $.fn.Fullpage.settings = {
        sectionBox: ".section-box",
        section: ".section",
        ctrlBtnBox: ".btnBox",
        activeBtnCls: ".active",
        index: 0,
        easing: "ease-in-out",
        duration: 1000,
        loop: false,
        hasCtrlBtn: true,
        keyboard: true,
        direction: "vertical",
        callback: "",
    };
})(jQuery);
