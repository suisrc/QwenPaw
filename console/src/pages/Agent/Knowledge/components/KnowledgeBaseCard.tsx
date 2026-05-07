import { useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Select, Tag } from "@agentscope-ai/design";
import { useTranslation } from "react-i18next";
import api from "../../../../api";
import type { KnowledgeBaseSummary } from "../../../../api/types";

export function KnowledgeBaseCard() {
  const { t } = useTranslation();
  const form = Form.useFormInstance();
  const [options, setOptions] = useState<KnowledgeBaseSummary[]>([]);
  const [keywordDrafts, setKeywordDrafts] = useState<Record<string, string>>({});
  const items = Form.useWatch("knowledge_base_config", form) || [];

  const normalizeKeywords = (keywords: string[]) => {
    const nextKeywords: string[] = [];
    const seen = new Set<string>();
    for (const keyword of keywords) {
      const normalized = keyword.trim();
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      nextKeywords.push(normalized);
    }
    return nextKeywords;
  };

  const updateKeywords = (index: number, keywords: string[]) => {
    const nextItems = [...items];
    nextItems[index] = {
      ...nextItems[index],
      keywords: normalizeKeywords(keywords),
    };
    form.setFieldsValue({ knowledge_base_config: nextItems });
  };

  useEffect(() => {
    const run = async () => {
      try {
        const response = await api.listKnowledgeBases();
        setOptions(response.items);
      } catch {
        setOptions([]);
      }
    };
    run();
  }, []);

  return (
    <Card title={t("agentConfig.knowledgeBaseTitle")}>
      <div style={{ marginBottom: 16, color: "rgba(20,20,19,0.65)" }}>
        {t("agentConfig.knowledgeBaseDescription")}
      </div>

      <Form.List name="knowledge_base_config">
        {(fields, { add, remove }) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {fields.map((field, index) => (
              <Card
                key={field.key}
                size="small"
                title={t("agentConfig.knowledgeBaseItemTitle", { index: index + 1 })}
                extra={
                  <Button danger size="small" onClick={() => remove(field.name)}>
                    {t("common.delete")}
                  </Button>
                }
              >
                <Form.Item
                  label={t("agentConfig.knowledgeBaseSelect")}
                  name={[field.name, "id"]}
                  rules={[{ required: true, message: t("agentConfig.knowledgeBaseSelectRequired") }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={options.map((item) => ({
                      label: `${item.name} (${item.id})`,
                      value: item.id,
                    }))}
                  />
                </Form.Item>
                <Form.Item label={t("agentConfig.knowledgeBasePriority")} name={[field.name, "priority"]}>
                  <InputNumber min={1} max={99} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item label={t("agentConfig.knowledgeBaseTrigger")} name={[field.name, "trigger"]}>
                  <Select
                    options={[
                      { label: t("agentConfig.knowledgeBaseTriggerAlways"), value: "always" },
                      { label: t("agentConfig.knowledgeBaseTriggerKeyword"), value: "keyword" },
                    ]}
                  />
                </Form.Item>
                <Form.Item label={t("agentConfig.knowledgeBaseTopK")} name={[field.name, "retrieval_top_k"]}>
                  <InputNumber min={1} max={20} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item label={t("agentConfig.knowledgeBaseUsageRule")} name={[field.name, "usage_rule"]}>
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item label={t("agentConfig.knowledgeBaseKeywords")}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {normalizeKeywords(items[index]?.keywords || []).length > 0 ? (
                        normalizeKeywords(items[index]?.keywords || []).map((keyword) => (
                          <Tag
                            key={keyword}
                            closable
                            onClose={(event) => {
                              event.preventDefault();
                              updateKeywords(
                                index,
                                  (items[index]?.keywords || []).filter((item: string) => item !== keyword),
                              );
                            }}
                          >
                            {keyword}
                          </Tag>
                        ))
                      ) : null}
                    </div>
                    <Input
                      value={keywordDrafts[field.key] || ""}
                      placeholder={t("agentConfig.knowledgeBaseKeywordsPlaceholder")}
                      onChange={(event) =>
                        setKeywordDrafts((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      onPressEnter={() => {
                        const draft = (keywordDrafts[field.key] || "").trim();
                        if (!draft) {
                          return;
                        }
                        updateKeywords(index, [...(items[index]?.keywords || []), draft]);
                        setKeywordDrafts((current) => ({ ...current, [field.key]: "" }));
                      }}
                    />
                  </div>
                </Form.Item>
              </Card>
            ))}

            <Button
              onClick={() =>
                add({
                  priority: fields.length + 1,
                  trigger: "always",
                  retrieval_top_k: 3,
                  usage_rule: "",
                  keywords: [],
                })
              }
            >
              {t("agentConfig.knowledgeBaseAdd")}
            </Button>
          </div>
        )}
      </Form.List>
    </Card>
  );
}