import {
  FormattingToolbar,
  FormattingToolbarController,
  BlockTypeSelect,
  FileCaptionButton,
  FileReplaceButton,
  BasicTextStyleButton,
  TextAlignButton,
  ColorStyleButton,
  CreateLinkButton
} from '@blocknote/react'
import { AIToolbarButton } from '@blocknote/xl-ai'
import { LanguageModelV1 } from '@ai-sdk/provider'

export const FormattingToolbarWithAI = ({
  currentAiModel
}: {
  currentAiModel: LanguageModelV1 | null
}): JSX.Element => {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          <BlockTypeSelect key="blockTypeSelect" />
          <FileCaptionButton key="fileCaptionButton" />
          <FileReplaceButton key="replaceFileButton" />
          <BasicTextStyleButton basicTextStyle="bold" key="boldStyleButton" />
          <BasicTextStyleButton basicTextStyle="italic" key="italicStyleButton" />
          <BasicTextStyleButton basicTextStyle="underline" key="underlineStyleButton" />
          <BasicTextStyleButton basicTextStyle="strike" key="strikeStyleButton" />
          <BasicTextStyleButton basicTextStyle="code" key="codeStyleButton" />
          <TextAlignButton textAlignment="left" key="textAlignLeftButton" />
          <TextAlignButton textAlignment="center" key="textAlignCenterButton" />
          <TextAlignButton textAlignment="right" key="textAlignRightButton" />
          <ColorStyleButton key="colorStyleButton" />
          <CreateLinkButton key="createLinkButton" />
          {currentAiModel && <AIToolbarButton key="aiToolbarButton" />}
        </FormattingToolbar>
      )}
    />
  )
} 