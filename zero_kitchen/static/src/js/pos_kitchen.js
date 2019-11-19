odoo.define('zero_kitchen.pos_kitchen_order', function (require) {
"use strict";

var screens = require('point_of_sale.screens');
var gui = require('point_of_sale.gui');
var core = require('web.core');
var rpc = require('web.rpc');
var PopupWidget = require('point_of_sale.popups');
var ProductListWidget = screens.ProductListWidget;
var ScreenWidget = screens.ScreenWidget;
var QWeb = core.qweb;
var _t = core._t;

var KitchenPopupWidget = PopupWidget.extend({
    template: 'KitchenPopupWidget',
    events: _.extend({}, PopupWidget.prototype.events,{
        "keyup .order_date" : "date_validate",
    }),
    show: function(options){
        options = options || {};
        var self = this;
        this._super(options);
        this.renderElement();
    },
    date_validate: function(){
        var v = $(".order_date").val();
        if (v.match(/^\d{4}$/) !== null) {
            $(".order_date").val(v + '/');
            }
        else if (v.match(/^\d{4}\/\d{2}$/) !== null) {
            $(".order_date").val(v + '/');
            }
        },
    click_confirm: function(){
        var self = this;
        var new_kitchen = [];
        var fields = _.find(this.pos.models,function(model){ return model.model === 'pos.kitchen'; }).fields;
        var line_fields = _.find(this.pos.models,function(model){ return model.model === 'pos.kitchen.line'; }).fields;
        var today = new Date().toJSON().slice(0,10);
        var order = this.pos.get_order();
        var order_to_save = order.export_as_JSON();
        var order_lines = this.pos.get_order().get_orderlines();
        var order_date = this.$('.order_date').val();
        var order_note = this.$('.order_note').val();
        var valid_date = true;
        var validatePattern = /^(\d{4})([/|-])(\d{1,2})([/|-])(\d{1,2})$/;
        if (order_date){
            var dateValues = order_date.match(validatePattern);
            if (dateValues == null){
                valid_date = false;
            }
            else{
                var orderYear = dateValues[1];
                var orderMonth = dateValues[3];
                var orderDate =  dateValues[5];
                if ((orderMonth < 1) || (orderMonth > 12)) {
                    valid_date = false;
                }
                else if ((orderDate < 1) || (orderDate> 31)) {
                    valid_date = false;
                }
                else if ((orderMonth==4 || orderMonth==6 || orderMonth==9 || orderMonth==11) && orderDate ==31) {
                    valid_date = false;
                }
                else if (orderMonth == 2){
                    var isleap = (orderYear % 4 == 0 && (orderYear % 100 != 0 || orderYear % 400 == 0));
                    if (orderDate> 29 || (orderDate ==29 && !isleap)){
                        valid_date = false;
                    }
                }
                var dates = [orderYear,orderMonth,orderDate];
                order_date = dates.join('-');
            }
        }
        $('.alert_msg').text("");
        if (order_date && order_date < today || valid_date==false || !order_date){
            $('.alert_msg').text("Please Select Valid Order Date!");
        }
        else{
            $('.alert_msg').text("");
            if (order_date){
                order_to_save.date_order = order_date;
                }
            order_to_save.note = order_note;
            rpc.query({
                model: 'pos.kitchen',
                method: 'create_from_ui',
                args: [order_to_save],
            })
            .then(function(order){
                rpc.query({
                    model: 'pos.kitchen',
                    method: 'search_read',
                    args: [[['id', '=', order['id']]], fields],
                    limit: 1,
                })
                .then(function (kitchen){
                    self.pos.kitchenorders.push(kitchen[0]);
                     for (var line in kitchen[0]['lines']){
                        rpc.query({
                            model: 'pos.kitchen.line',
                            method: 'search_read',
                            args: [[['id', '=', kitchen[0]['lines'][line]]], line_fields],
                            limit: 1,
                        }).then(function (kitchen_line){
                        console.log(kitchen_line);
                        self.pos.kitchen_lines.push(kitchen_line[0]);
                    });
                }
            });
            self.gui.close_popup();
            self.gui.show_popup('pos_kitchen_result',{
            'body': _t('Kitchen Ref : ')+ order['name'] ,
            });
        });
    }
    },

});
var KitchenListScreenWidget = ScreenWidget.extend({
    template: 'KitchenListScreenWidget',
    back_screen:   'product',
    init: function(parent, options){
        var self = this;
        this._super(parent, options);
    },

    show: function(){
        var self = this;
        this._super();
        this.renderElement();
        this.$('.back').click(function(){
            self.gui.back();
        });

        var kitchenorders = this.pos.kitchenorders;
        this.render_list(kitchenorders);

         this.$('.kitchen-list-contents').delegate('.kitchen-line .confirm_kitchen','click',function(event){
            self.line_select(event,$(this.parentElement.parentElement),parseInt($(this.parentElement.parentElement).data('id')));
        });

        var search_timeout = null;

        if(this.pos.config.iface_vkeyboard && this.chrome.widget.keyboard){
            this.chrome.widget.keyboard.connect(this.$('.searchbox input'));
        }

        this.$('.searchbox input').on('keyup',function(event){
            clearTimeout(search_timeout);
            var query = this.value;
            search_timeout = setTimeout(function(){
                self.perform_search(query,event.which === 13);
            },70);
        });

        this.$('.searchbox .search-clear').click(function(){
            self.clear_search();
        });
    },

    render_list: function(kitchenorders){
        var contents = this.$el[0].querySelector('.kitchen-list-contents');
        contents.innerHTML = "";
        for(var i = 0, len = Math.min(kitchenorders.length,1000); i < len; i++){
            var kitchen    = kitchenorders[i];
            var kitchen_line_html = QWeb.render('KitchenLine',{widget: this, kitchen:kitchenorders[i]});
            var kitchen_line = document.createElement('tbody');
            kitchen_line.innerHTML = kitchen_line_html;
            kitchen_line = kitchen_line.childNodes[1];
            contents.appendChild(kitchen_line);
        }
    },

    line_select: function(event,$line,id){
        var self = this;
        var order = this.pos.get_order();
        for (var kitchen_id in this.pos.kitchenorders){
            if (this.pos.kitchenorders[kitchen_id]['id'] == id){
                var selected_kitchen = this.pos.kitchenprders[kitchen_id]
            }
        }
        if (selected_kitchen){
            for (var line in this.pos.kitchen_lines){
                if (selected_kitchen['lines'].indexOf(this.pos.kitchen_lines[line]['id']) > -1 ){
                var product_id = this.pos.db.get_product_by_id(this.pos.kitchen_lines[line]['product_id'][0]);
                this.pos.get_order().add_product(product_id,{ quantity: this.pos.kitchen_lines[line]['qty']});
                }
            }
            order.kitchen_ref = selected_kitchen;
            this.gui.show_screen('products');
        }

    },

    perform_search: function(query, associate_result){
        var kitchenorders;
        if(query){
            kitchenorders = this.search_kitchen(query);
            this.render_list(kitchenorders);
        }else{
            kitchenorders = this.pos.kitchenorders;
            this.render_list(kitchenorders);
        }
    },
    clear_search: function(){
        var kitchenorders = this.pos.kitchenorders;
        this.render_list(kitchenorders);
        this.$('.searchbox input')[0].value = '';
        this.$('.searchbox input').focus();
    },

    search_kitchen: function(query){
        try {
            var re = RegExp(query);
        }catch(e){
            return [];
        }
        var results = [];
        for (var kitchen_id in this.pos.kitchenorders){
            var r = re.exec(this.pos.kitchenorders[kitchen_id]['name']);
            if(r){
            results.push(this.pos.kitchenorders[kitchen_id]);
            }
        }
        return results;
    },
});


gui.define_popup({name:'pos_kitchen', widget: KitchenPopupWidget});

var KitchenResultPopupWidget = PopupWidget.extend({
    template: 'KitchenResultPopupWidget',
});

gui.define_popup({name:'pos_kitchen_result', widget: KitchenResultPopupWidget});
gui.define_screen({name:'kitchen_list', widget: KitchenListScreenWidget});

var KitchenListButton = screens.ActionButtonWidget.extend({
    template: 'KitchenListButton',
    button_click: function(){
        this.gui.show_screen('kitchen_list');
    }
});

screens.define_action_button({
    'name': 'pos_kitchen_list',
    'widget': KitchenListButton,
    'condition': function () {
        return this.pos.config.enable_kitchen;
    }
});


var KitchenButton = screens.ActionButtonWidget.extend({
    template: 'KitchenButton',
    button_click: function(){
        var order_lines = this.pos.get_order().get_orderlines();
        var flag_negative = false;
        for (var line in order_lines){
            if (order_lines[line].quantity < 0){
                flag_negative = true;
            }
        }
        if(this.pos.get_order().get_orderlines().length > 0 && flag_negative == false ){
            this.gui.show_popup('pos_kitchen');
        }
        else if(flag_negative == true){
            this.gui.show_popup('pos_kitchen_result',{
                'body': _t('Invalid Order: Negative Quantity is Not Allowed'),
            });
        }
    },
});

screens.define_action_button({
    'name': 'pos_kitchen_order',
    'widget': KitchenButton,
    'condition': function () {
        return this.pos.config.enable_kitchen;
    }
});

});

