import re
import sys

file_path = r'c:\Users\eduar\Documents\brand-builder-ai\src\pages\GeneratorPage.tsx'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Replace Tone and Funnel with imports
    text = re.sub(
        r"type Tone\s*=\s*'Casual' \| 'Sério' \| 'Informativo' \| 'Humor' \| 'Urgente';\ntype Funnel\s*=\s*'Awareness' \| 'Educativo' \| 'Captar Leads' \| 'Vendas' \| 'Engajamento';",
        "import type { Tone, Funnel, RssTopic } from '@/components/postgen/GeneratorTypes';\nconst GeneratorWizard = lazy(() => import('@/components/postgen/GeneratorWizard'));\nconst GeneratorSidebar = lazy(() => import('@/components/postgen/GeneratorSidebar'));\nconst GeneratorInspector = lazy(() => import('@/components/postgen/GeneratorInspector'));\nconst GeneratorStage = lazy(() => import('@/components/postgen/GeneratorStage'));",
        text
    )

    # Remove RssTopic interface
    text = re.sub(
        r"interface RssTopic {[\s\S]*?hook_suggestions\?: string\[\];\n}",
        "",
        text
    )

    # Replace the giant render block
    parts = text.split('if (wizardStep < 4) {')
    if len(parts) < 2:
        print("Couldn't find if (wizardStep < 4) {")
        sys.exit(1)

    render_content = '''if (wizardStep < 4) {
    return (
      <GeneratorWizard
        wizardStep={wizardStep}
        setWizardStep={setWizardStep}
        topic={topic}
        setTopic={setTopic}
        setSelectedSourceUrl={setSelectedSourceUrl}
        isFetchingRss={isFetchingRss}
        handleFetchRss={handleFetchRss}
        showRssPanel={showRssPanel}
        setShowRssPanel={setShowRssPanel}
        rssTopics={rssTopics}
        format={format}
        setFormat={setFormat}
        FORMAT_OPTIONS={FORMAT_OPTIONS}
        slideCount={slideCount}
        setSlideCount={setSlideCount}
        globalImageMethod={globalImageMethod}
        setGlobalImageMethod={setGlobalImageMethod}
        globalTemplate={globalTemplate}
        setGlobalTemplate={setGlobalTemplate}
        clonedDna={clonedDna}
        recommendedTemplateId={recommendedTemplateId}
        selectedCharacterId={selectedCharacterId}
        setSelectedCharacterId={setSelectedCharacterId}
        availableCharacters={availableCharacters}
        selectedCharacter={selectedCharacter}
        preloadedMediaAsset={preloadedMediaAsset}
        handleGenerate={handleGenerate}
        genStep={genStep}
      />
    );
  }

  const activeSlide = slideConfigs[activeSlideIdx];

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleUploadBgActiveSlide(e.target.files[0])} />
      
      <GeneratorSidebar
        slideConfigs={slideConfigs}
        setSlideConfigs={setSlideConfigs}
        activeSlideIdx={activeSlideIdx}
        setActiveSlideIdx={setActiveSlideIdx}
        width={width}
        height={height}
        createSlideConfig={createSlideConfig}
        renderSlideConfig={renderSlideConfig}
      />

      <GeneratorStage
        postTitle={postTitle}
        activeArcLabel={activeArcLabel}
        selectedCharacter={selectedCharacter}
        width={width}
        height={height}
        activeSlideIdx={activeSlideIdx}
        slideConfigs={slideConfigs}
        setActiveSlideIdx={setActiveSlideIdx}
        format={format}
        setSlideConfigs={setSlideConfigs}
        extractSlideFields={extractSlideFields}
      />

      <GeneratorInspector
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        simlabRun={simlabRun}
        simlabInsight={simlabInsight}
        simlabVariants={simlabVariants}
        simlabLoading={simlabLoading}
        simlabError={simlabError}
        refreshSimlabRun={refreshSimlabRun}
        selectedNode={selectedNode}
        handleStyleUpdate={handleStyleUpdate}
        brand={brand}
        activeSlide={activeSlide}
        activeSlideIdx={activeSlideIdx}
        recommendedTemplateId={recommendedTemplateId}
        selectedCharacter={selectedCharacter}
        availableCharacters={availableCharacters}
        selectedCharacterId={selectedCharacterId}
        setSelectedCharacterId={setSelectedCharacterId}
        VIS_MODES={VIS_MODES}
        updateSlideConfig={updateSlideConfig}
        clonedDna={clonedDna}
        isGenImg={isGenImg}
        handleBgGenForActiveSlide={handleBgGenForActiveSlide}
        fileInputRef={fileInputRef}
        caption={caption}
        setCaption={setCaption}
        hashtags={hashtags}
        removeHashtag={removeHashtag}
        width={width}
        height={height}
        postTitle={postTitle}
        exportSlide={exportSlide}
        exportAllSlides={exportAllSlides}
        exportSlidesPDF={exportSlidesPDF}
        exportSlidesHTML={exportSlidesHTML}
        slideConfigs={slideConfigs}
        isLaunchingRemotion={isLaunchingRemotion}
        handleAnimateWithRemotion={handleAnimateWithRemotion}
        remotionJobId={remotionJobId}
        remotionCompositionId={remotionCompositionId}
        remotionResultUrl={remotionResultUrl}
        remotionStatusPayload={remotionStatusPayload}
        refreshRemotionJob={refreshRemotionJob}
        isSavingLibrary={isSavingLibrary}
        handleSaveToLibrary={handleSaveToLibrary}
        setWizardStep={setWizardStep}
      />
    </div>
  );
};

export default GeneratorPage;
'''
    
    # We strip out everything after if (wizardStep < 4) { except the final `export default GeneratorPage;`
    end_part = parts[1].split('export default GeneratorPage;')
    if len(end_part) < 2:
        print("Couldn't find export default GeneratorPage;")
        sys.exit(1)
        
    new_text = parts[0] + render_content

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Success")
except Exception as e:
    print(f"Error: {e}")
