const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
        BorderStyle, WidthType, ShadingType, PageNumber, PageBreak } = require('docx');
const fs = require('fs');

// ========== 通用样式定义 ==========
const border = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
const borders = { top: border, bottom: border, left: border, right: border };
const headerShading = { fill: "FFFFFF", type: ShadingType.CLEAR };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

// 创建表头单元格
function headerCell(text, width) {
    return new TableCell({
        borders,
        width: { size: width, type: WidthType.DXA },
        shading: headerShading,
        margins: cellMargins,
        verticalAlign: "center",
        children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text, bold: true, size: 19 })]
        })]
    });
}

// 创建数据单元格
function dataCell(text, width, align = AlignmentType.LEFT) {
    return new TableCell({
        borders,
        width: { size: width, type: WidthType.DXA },
        margins: cellMargins,
        verticalAlign: "center",
        children: [new Paragraph({
            alignment: align,
            children: [new TextRun({ text: String(text), size: 19 })]
        })]
    });
}

// 创建复选框单元格
function checkCell(passed = true, width = 800) {
    return new TableCell({
        borders,
        width: { size: width, type: WidthType.DXA },
        margins: cellMargins,
        verticalAlign: "center",
        children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: passed ? "☑通过" : "□不通过", size: 19 })]
        })]
    });
}

// 普通段落
function para(text, size = 21, bold = false) {
    return new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text, size, bold })]
    });
}

// 空行
function emptyLine() {
    return new Paragraph({ children: [new TextRun("")] });
}

const doc = new Document({
    styles: {
        default: { document: { run: { font: "宋体", size: 21 } } }
    },
    sections: [{
        properties: {
            page: {
                size: { width: 11906, height: 16838 },
                margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
            }
        },
        headers: {
            default: new Header({
                children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "", size: 18 })]
                })]
            })
        },
        footers: {
            default: new Footer({
                children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: "第 ", size: 18 }),
                        new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
                        new TextRun({ text: " 页  共 ", size: 18 }),
                        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 }),
                        new TextRun({ text: " 页", size: 18 })
                    ]
                })]
            })
        },
        children: [
            // ==================== 第1页：项目信息 ====================
            emptyLine(),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 200 },
                children: [new TextRun({ text: "星地多网融合指挥调度SaaS平台1期", bold: true, size: 36 })]
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                children: [new TextRun({ text: "监控平台重构项目验收", bold: true, size: 36 })]
            }),

            // 项目信息表格
            new Table({
                width: { size: 9638, type: WidthType.DXA },
                columnWidths: [1800, 3000, 1800, 3038],
                rows: [
                    new TableRow({ children: [
                        headerCell("项目名称", 1800),
                        dataCell("星地多网融合指挥调度SaaS平台1期.监控平台重构", 3000),
                        headerCell("合同编号", 1800),
                        dataCell("", 3038)
                    ]}),
                    new TableRow({ children: [
                        headerCell("项目委托方", 1800),
                        dataCell("", 3000),
                        headerCell("项目受托方", 1800),
                        dataCell("广州磐钴智能科技有限公司", 3038)
                    ]}),
                    new TableRow({ children: [
                        headerCell("验收内容", 1800),
                        new TableCell({
                            borders,
                            width: { size: 7838, type: WidthType.DXA },
                            columnSpan: 3,
                            margins: cellMargins,
                            children: [new Paragraph({
                                children: [new TextRun({ text: "星地多网融合指挥调度SaaS平台1期.监控平台重构软件系统、定制开发服务及相关交付物", size: 19 })]
                            })]
                        })
                    ]}),
                    new TableRow({ children: [
                        headerCell("验收日期", 1800),
                        new TableCell({
                            borders,
                            width: { size: 7838, type: WidthType.DXA },
                            columnSpan: 3,
                            margins: cellMargins,
                            children: [new Paragraph({
                                children: [new TextRun({ text: "2026 年    月    日", size: 19 })]
                            })]
                        })
                    ]})
                ]
            }),

            emptyLine(),

            // ==================== 验收内容表格（第1部分） ====================
            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 200, after: 100 },
                children: [new TextRun({ text: "1 验收内容", bold: true, size: 24 })]
            }),
            para("依据《星地多网融合指挥调度SaaS平台1期.监控平台重构》项目需求内容，现将交付产品及相应验收内容列示如下：", 19),

            new Table({
                width: { size: 9638, type: WidthType.DXA },
                columnWidths: [700, 1600, 5738, 800, 800],
                rows: [
                    // 表头
                    new TableRow({ children: [
                        headerCell("序号", 700),
                        headerCell("功能项目", 1600),
                        headerCell("功能描述", 5738),
                        headerCell("测试结果", 800),
                        headerCell("", 800)
                    ]}),
                    // 第1-8项
                    new TableRow({ children: [
                        dataCell("1", 700, AlignmentType.CENTER),
                        dataCell("统一登录与账号体系", 1600),
                        dataCell("支持账号登录与密码安全控制，支持一级/二级/三级账号权限分级及资源分配", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]}),
                    new TableRow({ children: [
                        dataCell("2", 700, AlignmentType.CENTER),
                        dataCell("设备管理与分组", 1600),
                        dataCell("支持设备单个/批量绑定、分组创建与调整、设备导入导出及信息维护", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]}),
                    new TableRow({ children: [
                        dataCell("3", 700, AlignmentType.CENTER),
                        dataCell("地图定位与轨迹", 1600),
                        dataCell("支持实时定位、历史轨迹查询、轨迹导出，支持多端监控、多端轨迹及状态展示，地图切换", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]}),
                    new TableRow({ children: [
                        dataCell("4", 700, AlignmentType.CENTER),
                        dataCell("通信与消息中心", 1600),
                        dataCell("支持终端与平台文本/语音/图片短报文消息收发；支持报警与报平安记录查询", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]}),
                    new TableRow({ children: [
                        dataCell("5", 700, AlignmentType.CENTER),
                        dataCell("SOS求救群聊闭环", 1600),
                        dataCell("支持SOS触发建群、成员入群、群内双向通信、救援完成关闭及额度处理", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]}),
                    new TableRow({ children: [
                        dataCell("6", 700, AlignmentType.CENTER),
                        dataCell("指令与告警处置", 1600),
                        dataCell("支持批量指令下发、离线告警触发及告警批量处理", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]}),
                    new TableRow({ children: [
                        dataCell("7", 700, AlignmentType.CENTER),
                        dataCell("套餐与订单管理", 1600),
                        dataCell("支持套餐选购与支付，支持订单查询与状态流转、套餐明细及额度展示", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]}),
                    new TableRow({ children: [
                        dataCell("8", 700, AlignmentType.CENTER),
                        dataCell("电子围栏", 1600),
                        dataCell("支持围栏绘制与告警触发", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]})
                ]
            }),

            // ==================== 第2页继续 ====================
            new Paragraph({ children: [new PageBreak()] }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 100, after: 100 },
                children: [new TextRun({ text: "序号", size: 19 })]
            }),

            new Table({
                width: { size: 9638, type: WidthType.DXA },
                columnWidths: [700, 1600, 5738, 800, 800],
                rows: [
                    // 表头（续）
                    new TableRow({ children: [
                        headerCell("序号", 700),
                        headerCell("功能项目", 1600),
                        headerCell("功能描述", 5738),
                        headerCell("测试结果", 800),
                        headerCell("", 800)
                    ]}),
                    // 第9-17项
                    new TableRow({ children: [
                        dataCell("9", 700, AlignmentType.CENTER),
                        dataCell("WebSocket实时推送", 1600),
                        dataCell("支持终端位置/状态/报警/聊天实时推送，支持断线重连、心跳保活、权限隔离", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]}),
                    new TableRow({ children: [
                        dataCell("10", 700, AlignmentType.CENTER),
                        dataCell("智能通知策略与频控", 1600),
                        dataCell("支持分层通知：紧急报警（如SOS/落水）可通过电话、短信、微信全渠道即时触达紧急联系人，并设48小时/30分钟冷却机制；常规状态通知（如超速、欠压、设备上线、报平安）通过微信、公众号、邮箱精准推送；同时支持每日报警汇总推送及通知方式自定义配置", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]}),
                    new TableRow({ children: [
                        dataCell("11", 700, AlignmentType.CENTER),
                        dataCell("【小程序】设备分享与关注", 1600),
                        dataCell("绑定者可分享设备关注链接，好友通过链接完成关注；关注后可接收该设备动态通知", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]}),
                    new TableRow({ children: [
                        dataCell("12", 700, AlignmentType.CENTER),
                        dataCell("【小程序】消息免打扰与关注恢复", 1600),
                        dataCell("支持按设备开启/关闭消息免打扰；支持在聊天记录中将设备重新关注并恢复至设备列表", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]}),
                    new TableRow({ children: [
                        dataCell("13", 700, AlignmentType.CENTER),
                        dataCell("【小程序】紧急联系人", 1600),
                        dataCell("支持手动录入或通讯录导入1-3名紧急联系人；支持对好友紧急通知请求进行接收/拒绝", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]}),
                    new TableRow({ children: [
                        dataCell("14", 700, AlignmentType.CENTER),
                        dataCell("【小程序】云平台与设备订阅", 1600),
                        dataCell("个人账号可扫码绑定一级账号云平台，设备触发SOS时可联动通知关注平台", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]}),
                    new TableRow({ children: [
                        dataCell("15", 700, AlignmentType.CENTER),
                        dataCell("【小程序】短信链接关注设备", 1600),
                        dataCell("支持复制短信内容后由小程序识别并关注设备", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]}),
                    new TableRow({ children: [
                        dataCell("16", 700, AlignmentType.CENTER),
                        dataCell("【小程序】身份切换", 1600),
                        dataCell("支持个人账号与企业账号身份切换，企业账号按创建规则登录", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]}),
                    new TableRow({ children: [
                        dataCell("17", 700, AlignmentType.CENTER),
                        dataCell("说明书", 1600),
                        dataCell("星地多网融合指挥调度SaaS平台监控平台重构使用指南", 5738),
                        checkCell(true, 800),
                        checkCell(false, 800)
                    ]})
                ]
            }),

            emptyLine(),

            // 验收总结
            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 200, after: 100 },
                children: [new TextRun({ text: "2 验收总结", bold: true, size: 24 })]
            }),
            para("本项目所交付的星地多网融合指挥调度SaaS平台1期.监控平台重构软件系统、定制开发服务及相关交付物，在功能完整性、系统稳定性及文档齐全性方面，均【符合】项目需求与合同约定。平台各项核心功能运行正常，相关操作文档已移交完毕，验收结论为【通过】。", 21),

            emptyLine(),

            // 验收确认
            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 200, after: 100 },
                children: [new TextRun({ text: "3 验收确认", bold: true, size: 24 })]
            }),

            new Table({
                width: { size: 9638, type: WidthType.DXA },
                columnWidths: [1800, 7838],
                rows: [
                    new TableRow({ children: [
                        headerCell("项目名称", 1800),
                        dataCell("星地多网融合指挥调度SaaS平台1期.监控平台重构", 7838)
                    ]}),
                    new TableRow({ children: [
                        headerCell("委托方", 1800),
                        dataCell("", 7838)
                    ]}),
                    new TableRow({ children: [
                        headerCell("受托方", 1800),
                        dataCell("广州磐钴智能科技有限公司", 7838)
                    ]}),
                    new TableRow({ children: [
                        new TableCell({
                            borders,
                            width: { size: 1800, type: WidthType.DXA },
                            rowSpan: 3,
                            margins: cellMargins,
                            verticalAlign: "center",
                            children: [new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: "验 收 内 容", bold: true, size: 19 })]
                            })]
                        }),
                        dataCell("1、正式产品（软件）状态符合项目正式需求", 7838)
                    ]}),
                    new TableRow({ children: [
                        dataCell("2、确认合同验收项功能正常使用", 7838)
                    ]}),
                    new TableRow({ children: [
                        dataCell("3、材料文档（使用说明书）符合交付需求", 7838)
                    ]})
                ]
            }),

            // ==================== 第3页：签批区 ====================
            new Paragraph({ children: [new PageBreak()] }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 100, after: 200 },
                children: [new TextRun({ text: "验 收 意 见", bold: true, size: 24 })]
            }),
            para("平台功能测试验证符合需求，材料文档均已交付。", 21),

            emptyLine(),

            // 签批表格
            new Table({
                width: { size: 9638, type: WidthType.DXA },
                columnWidths: [4819, 4819],
                rows: [
                    new TableRow({ children: [
                        headerCell("委托方", 4819),
                        headerCell("受托方", 4819)
                    ]}),
                    new TableRow({ children: [
                        new TableCell({
                            borders,
                            width: { size: 4819, type: WidthType.DXA },
                            margins: cellMargins,
                            children: [
                                new Paragraph({ children: [new TextRun({ text: "盖章：", size: 19 })] }),
                                new Paragraph({ children: [new TextRun({ text: "", size: 19 })] }),
                                new Paragraph({ children: [new TextRun({ text: "项目负责人：", size: 19 })] }),
                                new Paragraph({ children: [new TextRun({ text: "", size: 19 })] }),
                                new Paragraph({ children: [new TextRun({ text: "日期：    年    月    日", size: 19 })] })
                            ]
                        }),
                        new TableCell({
                            borders,
                            width: { size: 4819, type: WidthType.DXA },
                            margins: cellMargins,
                            children: [
                                new Paragraph({ children: [new TextRun({ text: "盖章：广州磐钴智能科技有限公司", size: 19 })] }),
                                new Paragraph({ children: [new TextRun({ text: "", size: 19 })] }),
                                new Paragraph({ children: [new TextRun({ text: "项目负责人：", size: 19 })] }),
                                new Paragraph({ children: [new TextRun({ text: "", size: 19 })] }),
                                new Paragraph({ children: [new TextRun({ text: "日期：    年    月    日", size: 19 })] })
                            ]
                        })
                    ]})
                ]
            }),

            emptyLine(),
            emptyLine(),

            // 交付产品
            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 200, after: 100 },
                children: [new TextRun({ text: "4 交付产品", bold: true, size: 24 })]
            }),

            new Table({
                width: { size: 9638, type: WidthType.DXA },
                columnWidths: [9638],
                rows: [
                    new TableRow({ children: [
                        headerCell("序号", 9638)
                    ]}),
                    new TableRow({ children: [
                        new TableCell({
                            borders,
                            width: { size: 9638, type: WidthType.DXA },
                            margins: cellMargins,
                            children: [new Paragraph({ children: [new TextRun({ text: "产品名称", size: 19 })] })]
                        })
                    ]})
                ]
            }),

            new Table({
                width: { size: 9638, type: WidthType.DXA },
                columnWidths: [9638],
                rows: [
                    new TableRow({ children: [
                        headerCell("产品名称", 3212),
                        headerCell("数量", 3212),
                        headerCell("备注", 3214)
                    ]}),
                    new TableRow({ children: [
                        dataCell("星地多网融合指挥调度SaaS平台1期.监控平台重构", 3212),
                        dataCell("1", 3212, AlignmentType.CENTER),
                        dataCell("", 3214)
                    ]}),
                    new TableRow({ children: [
                        dataCell("星地多网融合指挥调度SaaS平台监控平台重构操作说明书", 3212),
                        dataCell("1", 3212, AlignmentType.CENTER),
                        dataCell("", 3214)
                    ]})
                ]
            })
        ]
    }]
});

Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync("C:/Users/33606/Desktop/skills/监控平台重构项目验收报告_v2.docx", buffer);
    console.log("Report generated successfully!");
});
