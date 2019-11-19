# -*- coding: utf-8 -*-
#############################################################################
#
#              Zero For Information Systems.
#
#  Copyright (C) 2019-TODAY Zero Systems(<https://www.erpzero.com>).
#
#  Author:Zero Systems(<https://www.erpzero.com>).
#
# All Rights Reserved.
#
# This program is copyright property of the author mentioned above.
# You can`t redistribute it and/or modify it.
#
#############################################################################
{
    'name': 'Zero POS Kitchen Screen',
    'version': '1.0',
    'summary': """Create & Process Kitchen from POS""",
    'description': """This module allows to create and process kitchen orders from POS.""",
    'author': "Zero Systems",
    'company': "Zero for Information Systems",
    'website': "https://www.erpzero.com",
    'category': 'Point of Sale',
    'depends': ['point_of_sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/kitchen_templates.xml',
        'views/pos_kitchen.xml',
    ],
    'qweb': ['static/src/xml/pos_kitchen.xml'],
    'images': ['static/description/logo.PNG'],
    'installable': True,
    'auto_install': False,
    'auto_install': False,
}
