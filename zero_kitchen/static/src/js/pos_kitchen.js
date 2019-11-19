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
        "keyup .order_date" : ".order_date",
    }),
    show: function(options){
        options = options || {};
        var self = this;
        this._super(options);
        this.renderElement();
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
        
        if (order_date){
            var dateValues = order_date
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

