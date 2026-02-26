import {
  FileItem,
  FolderItem,
  FolderTrigger,
  FolderContent,
  Files,
  SubFiles,
} from "@/components/animate-ui/components/radix/files";
import { type AppFile, FILE_LABELS } from "@/lib/file-contents";

export type { AppFile } from "@/types";

interface AppSidebarProps {
  selected: AppFile;
  onSelect: (file: AppFile) => void;
}

const FileBtn = ({
  fileKey,
  selected,
  onSelect,
}: {
  fileKey: AppFile;
  selected: AppFile;
  onSelect: (f: AppFile) => void;
}) => {
  return (
    <button onClick={() => onSelect(fileKey)} className="w-full text-left">
      <FileItem
        className={selected === fileKey ? "font-semibold text-foreground" : ""}>
        {FILE_LABELS[fileKey]}
      </FileItem>
    </button>
  );
};

const AppSidebar = ({ selected, onSelect }: AppSidebarProps) => {
  return (
    <aside className="w-1/4 h-full border-r overflow-auto shrink-0">
      <Files
        className="w-full"
        defaultOpen={[
          "src",
          "(home)",
          "components",
          "animate-ui",
          "backgrounds",
          "buttons",
          "radix",
        ]}>
        <FolderItem value="src">
          <FolderTrigger>src</FolderTrigger>

          <FolderContent>
            <SubFiles
              defaultOpen={[
                "(home)",
                "components",
                "animate-ui",
                "backgrounds",
                "buttons",
                "radix",
              ]}>
              <FolderItem value="(home)">
                <FolderTrigger>(home)</FolderTrigger>
                <FolderContent>
                  <SubFiles>
                    <FileBtn
                      fileKey="dashboard"
                      selected={selected}
                      onSelect={onSelect}
                    />
                    <FileBtn
                      fileKey="session"
                      selected={selected}
                      onSelect={onSelect}
                    />
                  </SubFiles>
                </FolderContent>
              </FolderItem>

              <FolderItem value="components">
                <FolderTrigger>components</FolderTrigger>
                <FolderContent>
                  <SubFiles
                    defaultOpen={[
                      "animate-ui",
                      "backgrounds",
                      "buttons",
                      "radix",
                    ]}>
                    <FileBtn
                      fileKey="appsidebar"
                      selected={selected}
                      onSelect={onSelect}
                    />

                    <FolderItem value="animate-ui">
                      <FolderTrigger>animate-ui</FolderTrigger>
                      <FolderContent>
                        <SubFiles
                          defaultOpen={["backgrounds", "buttons", "radix"]}>
                          <FolderItem value="backgrounds">
                            <FolderTrigger>backgrounds</FolderTrigger>
                            <FolderContent>
                              <SubFiles>
                                <FileBtn
                                  fileKey="comp-gravity-stars"
                                  selected={selected}
                                  onSelect={onSelect}
                                />
                              </SubFiles>
                            </FolderContent>
                          </FolderItem>

                          <FolderItem value="buttons">
                            <FolderTrigger>buttons</FolderTrigger>
                            <FolderContent>
                              <SubFiles>
                                <FileBtn
                                  fileKey="comp-button"
                                  selected={selected}
                                  onSelect={onSelect}
                                />
                                <FileBtn
                                  fileKey="comp-flip"
                                  selected={selected}
                                  onSelect={onSelect}
                                />
                                <FileBtn
                                  fileKey="comp-liquid"
                                  selected={selected}
                                  onSelect={onSelect}
                                />
                              </SubFiles>
                            </FolderContent>
                          </FolderItem>

                          <FolderItem value="radix">
                            <FolderTrigger>radix</FolderTrigger>
                            <FolderContent>
                              <SubFiles>
                                <FileBtn
                                  fileKey="comp-files"
                                  selected={selected}
                                  onSelect={onSelect}
                                />
                                <FileBtn
                                  fileKey="comp-progress"
                                  selected={selected}
                                  onSelect={onSelect}
                                />
                              </SubFiles>
                            </FolderContent>
                          </FolderItem>
                        </SubFiles>
                      </FolderContent>
                    </FolderItem>
                  </SubFiles>
                </FolderContent>
              </FolderItem>

              <FileBtn fileKey="app" selected={selected} onSelect={onSelect} />
            </SubFiles>
          </FolderContent>
        </FolderItem>
      </Files>
    </aside>
  );
};

export default AppSidebar;
