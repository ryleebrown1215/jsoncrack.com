import React, { useState } from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Button, Textarea } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";
import useFile from "../../../store/useFile";


//returns object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj: Record<string, unknown> = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

//return JSON path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const jsonStore = useJson();
  const setGraph = useGraph(state => state.setGraph);

  const setContents = useFile(state => state.setContents);

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");

  //start editing and fill Textarea with node’s current JSON
  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(normalizeNodeData(nodeData?.text ?? []));
  };

  //save and update JSON text store (which auto-refreshes visualization)
  const handleSave = () => {
    try {
      const parsed = JSON.parse(editedContent);
      const currentJson = JSON.parse(jsonStore.json);
  
      if (nodeData?.path) {
        let ref: any = currentJson;
        const pathArray = nodeData.path;
        for (let i = 0; i < pathArray.length - 1; i++) {
          ref = ref[pathArray[i]];
        }
  
        const key = pathArray[pathArray.length - 1];
        const existing = ref[key];
  
        // merge or replace
        if (typeof existing === "object" && typeof parsed === "object" && !Array.isArray(parsed)) {
          ref[key] = { ...existing, ...parsed };
        } else {
          ref[key] = parsed;
        }
      }
  
      const updated = JSON.stringify(currentJson, null, 2);
  
      //update both the JSON store and the editor contents
      jsonStore.setJson(updated);
      setContents({ contents: updated });
  
      //trigger re-render of the graph
      setTimeout(() => {
        setGraph(updated);
      }, 50);
  
      setIsEditing(false);
    } catch (error) {
      console.error("Invalid JSON format", error);
      alert("Invalid JSON. Please fix syntax before saving.");
    }
  };  
  

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent("");
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Flex gap="xs">
              {!isEditing && <Button size="xs" onClick={handleEdit}>Edit</Button>}
              <CloseButton onClick={onClose} />
            </Flex>
          </Flex>

          <ScrollArea.Autosize mah={250} maw={600}>
            {isEditing ? (
              <Textarea
                value={editedContent}
                onChange={e => setEditedContent(e.target.value)}
                autosize
                minRows={6}
                maxRows={10}
              />
            ) : (
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            )}
          </ScrollArea.Autosize>
        </Stack>

        {isEditing && (
          <Flex justify="end" gap="xs">
            <Button size="xs" variant="default" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="xs" onClick={handleSave}>
              Save
            </Button>
          </Flex>
        )}

        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
